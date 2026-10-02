import { hideBody, showBody } from '@/components/common/hide-body.ts';
import {
	arrangeSpectrum,
	SPECTRUM_COLUMNS,
	type SpectrumColor,
} from '@/components/user/topcolors-spectrum.ts';
import { dom } from '@/utils/dom.ts';
import { previewTopbarColor } from '@/utils/topbar-color.ts';
import './topcolors-template.css';

const TOPCOLORS_ROOT_ID = 'oj-topcolors-root';

interface TopColor {
	hex: string;
}

interface TopColorSaveTarget {
	formValues: URLSearchParams;
	submitAction: URL;
	submitMethod: string;
}

const HEX_REGEX = /#?([0-9a-f]{6})/i;
const TOP_COLOR_FIELD_NAME = 'topc';
const FORM_SKIP_INPUT_TYPES = new Set(['button', 'file', 'image', 'reset', 'submit']);
const SWATCH_SELECTOR = '.oj-topcolors__swatch';
const KEYBOARD_DIRECTIONS = new Set([
	'ArrowLeft',
	'ArrowRight',
	'ArrowUp',
	'ArrowDown',
	'Home',
	'End',
]);

const normalizeHex = (value: string): string | null => {
	const hex = value.match(HEX_REGEX)?.[1];
	return hex ? `#${hex.toLowerCase()}` : null;
};

const formatTopColorForUserForm = (value: string): string => normalizeHex(value) ?? value;

const getUserSettingsForm = async (
	username: string
): Promise<{ form: HTMLFormElement; formUrl: URL } | undefined> => {
	const formUrl = new URL(`/user?id=${encodeURIComponent(username)}`, window.location.href);
	const response = await fetch(formUrl.toString(), {
		cache: 'no-store',
		credentials: 'include',
	});

	if (!response.ok) {
		throw new Error(`Failed to load user settings page (${response.status}).`);
	}

	const html = await response.text();
	const parser = new DOMParser();
	const remoteDoc = parser.parseFromString(html, 'text/html');
	const forms = Array.from(remoteDoc.querySelectorAll<HTMLFormElement>('form'));
	const formWithTopColor = forms.find((candidate) =>
		Boolean(candidate.querySelector<HTMLInputElement>(`input[name="${TOP_COLOR_FIELD_NAME}"]`))
	);
	if (!formWithTopColor) {
		return;
	}
	return { form: formWithTopColor, formUrl };
};

const appendControlEntry = (params: URLSearchParams, control: Element): void => {
	const isSupportedControl =
		control instanceof HTMLInputElement ||
		control instanceof HTMLSelectElement ||
		control instanceof HTMLTextAreaElement;
	if (!isSupportedControl) {
		return;
	}
	if (control.disabled || !control.name) {
		return;
	}

	if (control instanceof HTMLInputElement) {
		const type = control.type.toLowerCase();
		if (FORM_SKIP_INPUT_TYPES.has(type)) {
			return;
		}
		if ((type === 'checkbox' || type === 'radio') && !control.checked) {
			return;
		}
		params.append(control.name, control.value);
		return;
	}

	if (control instanceof HTMLSelectElement) {
		if (control.multiple) {
			for (const option of Array.from(control.selectedOptions)) {
				params.append(control.name, option.value);
			}
			return;
		}
		params.append(control.name, control.value);
		return;
	}

	params.append(control.name, control.value);
};

const collectFormEntries = (form: HTMLFormElement): URLSearchParams => {
	const params = new URLSearchParams();
	for (const element of Array.from(form.elements)) {
		appendControlEntry(params, element);
	}
	return params;
};

const getTopColorSaveTarget = async (username: string): Promise<TopColorSaveTarget | undefined> => {
	const formData = await getUserSettingsForm(username);
	if (!formData) {
		return;
	}
	const { form, formUrl } = formData;
	const formValues = collectFormEntries(form);
	const submitMethod = (form.method || 'post').toUpperCase();
	const submitAction = new URL(form.getAttribute('action') || formUrl.pathname, formUrl);
	return {
		formValues,
		submitAction,
		submitMethod,
	};
};

const submitTopColor = async (target: TopColorSaveTarget, color: string): Promise<void> => {
	const formValues = new URLSearchParams(target.formValues);
	formValues.set(TOP_COLOR_FIELD_NAME, formatTopColorForUserForm(color));
	const submitBody = formValues.toString();

	const response = await fetch(target.submitAction.toString(), {
		body: submitBody,
		cache: 'no-store',
		credentials: 'include',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
		},
		method: target.submitMethod,
		redirect: 'manual',
	});

	if (!response.ok && response.type !== 'opaqueredirect') {
		throw new Error(`Failed to save top color (${response.status}).`);
	}
	window.location.reload();
};

const extractTopColors = (doc: Document): TopColor[] => {
	const deduped = new Map<string, TopColor>();
	const anchors = Array.from(doc.querySelectorAll<HTMLAnchorElement>('a[href]')).filter(
		(anchor) =>
			Boolean(normalizeHex(anchor.textContent ?? '')) ||
			Boolean(normalizeHex(anchor.getAttribute('href') ?? ''))
	);
	const rows = Array.from(
		doc.querySelectorAll<HTMLTableRowElement>('#bigbox td > table > tbody > tr')
	);
	const sources: Array<HTMLAnchorElement | HTMLTableRowElement> =
		anchors.length > 0 ? anchors : rows;

	for (const source of sources) {
		const isAnchor = source instanceof HTMLAnchorElement;
		const primaryHex = isAnchor
			? normalizeHex(source.textContent ?? '')
			: normalizeHex(source.querySelector<HTMLTableCellElement>('td')?.textContent ?? '');
		const secondaryHex = isAnchor
			? normalizeHex(source.getAttribute('href') ?? '')
			: normalizeHex(
					source
						.querySelector<HTMLTableCellElement>('td:nth-child(2)')
						?.getAttribute('bgcolor') ?? ''
				);
		const hex = primaryHex ?? secondaryHex;
		if (!hex || deduped.has(hex)) {
			continue;
		}

		deduped.set(hex, { hex });
	}

	return Array.from(deduped.values());
};

const findContentContainer = (doc: Document): HTMLElement | null => {
	const bigbox = doc.querySelector('#bigbox');
	const table = bigbox?.querySelector('td > table');
	const tableContainer = table?.parentElement;
	if (tableContainer instanceof HTMLElement) {
		return tableContainer;
	}

	const anchors = Array.from(doc.querySelectorAll<HTMLAnchorElement>('a[href]'));
	for (const anchor of anchors) {
		const textHex = normalizeHex(anchor.textContent ?? '');
		const hrefHex = normalizeHex(anchor.getAttribute('href') ?? '');
		if (!(textHex || hrefHex)) {
			continue;
		}
		const td = anchor.closest('td');
		if (td instanceof HTMLElement) {
			return td;
		}
	}
	return null;
};

const createElement = <Tag extends keyof HTMLElementTagNameMap>(
	doc: Document,
	tag: Tag,
	name: string,
	text?: string
): HTMLElementTagNameMap[Tag] => {
	const element = doc.createElement(tag);
	element.className = `oj-topcolors__${name}`;
	if (text) {
		element.textContent = text;
	}
	return element;
};

const navigatePalette = (event: KeyboardEvent, palette: HTMLElement): void => {
	if (!(KEYBOARD_DIRECTIONS.has(event.key) && event.target instanceof HTMLButtonElement)) {
		return;
	}
	event.preventDefault();
	const view = palette.ownerDocument.defaultView;
	const buttons = Array.from(palette.querySelectorAll<HTMLButtonElement>(SWATCH_SELECTOR))
		.map((button) => ({ button, order: Number(view?.getComputedStyle(button).order) }))
		.sort((a, b) => a.order - b.order)
		.map(({ button }) => button);
	const columns =
		Number.parseInt(view?.getComputedStyle(palette).getPropertyValue('--columns') ?? '', 10) ||
		1;
	const index = buttons.indexOf(event.target);
	const offsets: Record<string, number> = {
		ArrowDown: columns,
		ArrowLeft: -1,
		ArrowRight: 1,
		ArrowUp: -columns,
		End: buttons.length - 1 - index,
		Home: -index,
	};
	const offset = offsets[event.key];
	if (offset === undefined || index < 0) {
		return;
	}
	const next = buttons[Math.max(0, Math.min(buttons.length - 1, index + offset))];
	if (!next) {
		return;
	}
	event.target.tabIndex = -1;
	next.tabIndex = 0;
	next.focus();
};

const createPalette = (
	doc: Document,
	colors: SpectrumColor[],
	neutral: boolean,
	onPreview: (color: SpectrumColor) => void,
	onSelect: (color: SpectrumColor, button: HTMLButtonElement) => void,
	onRestore: () => void
): HTMLElement => {
	const palette = createElement(doc, 'div', 'palette');
	palette.classList.toggle('oj-topcolors__palette--neutral', neutral);
	palette.setAttribute('role', 'group');
	palette.setAttribute(
		'aria-label',
		neutral ? 'Muted and neutral colors, light to dark' : 'Rainbow colors, light to dark'
	);
	for (const [size, columns] of Object.entries(SPECTRUM_COLUMNS)) {
		palette.style.setProperty(`--columns-${size}`, String(Math.min(columns, colors.length)));
	}
	for (const [index, color] of colors.entries()) {
		const button = createElement(doc, 'button', 'swatch');
		button.type = 'button';
		button.tabIndex = index === 0 ? 0 : -1;
		button.dataset.hex = color.hex;
		button.setAttribute('aria-label', `${color.hex}, popularity #${color.rank}`);
		button.setAttribute('aria-pressed', 'false');
		button.title = `${color.hex} · #${color.rank}`;
		for (const [size, order] of Object.entries(color.orders)) {
			button.style.setProperty(`--order-${size}`, String(neutral ? index : order));
		}
		const fill = createElement(doc, 'span', 'swatch-fill');
		fill.style.backgroundColor = color.hex;
		button.append(fill);
		button.addEventListener('pointerenter', () => onPreview(color));
		button.addEventListener('focus', () => onPreview(color));
		button.addEventListener('click', () => {
			const tabStop = palette.querySelector<HTMLButtonElement>('[tabindex="0"]');
			if (tabStop) {
				tabStop.tabIndex = -1;
			}
			button.tabIndex = 0;
			onSelect(color, button);
		});
		palette.append(button);
	}
	palette.addEventListener('pointerleave', onRestore);
	palette.addEventListener('focusout', (event) => {
		if (!(event.relatedTarget instanceof Node && palette.contains(event.relatedTarget))) {
			onRestore();
		}
	});
	palette.addEventListener('keydown', (event) => navigatePalette(event, palette));
	return palette;
};

const createTopcolorsTemplate = (
	doc: Document,
	colors: TopColor[],
	saveTarget?: TopColorSaveTarget
): HTMLElement => {
	const section = doc.createElement('section');
	section.className = 'oj-topcolors';
	const intro = createElement(doc, 'header', 'intro');
	const title = createElement(doc, 'h1', 'title', 'Top Colors');
	const subtitle = createElement(
		doc,
		'p',
		'subtitle',
		`${colors.length.toLocaleString()} community ${colors.length === 1 ? 'color' : 'colors'}. Find your shade of Hacker News.`
	);
	intro.append(title, subtitle);
	section.append(intro);
	const arranged = arrangeSpectrum(colors.map((color) => color.hex));
	const [initialColor] = arranged;
	if (!initialColor) {
		section.append(createElement(doc, 'p', 'empty', 'No colors to explore yet.'));
		return section;
	}
	let selected: SpectrumColor = initialColor;

	const inspector = createElement(doc, 'div', 'inspector');
	const sample = createElement(doc, 'span', 'sample');
	sample.setAttribute('aria-hidden', 'true');
	const details = createElement(doc, 'div', 'details');
	const hex = createElement(doc, 'span', 'hex');
	const rank = createElement(doc, 'span', 'rank');
	details.append(hex, rank);
	const actions = createElement(doc, 'div', 'actions');
	const copy = createElement(doc, 'button', 'copy-button', 'Copy hex');
	copy.type = 'button';
	const status = createElement(doc, 'p', 'status');
	status.setAttribute('role', 'status');
	const restoreHint = (): void => {
		status.textContent = 'Hover to explore. Click to select. Arrow keys to browse.';
	};
	restoreHint();
	copy.addEventListener('click', async () => {
		const value = selected.hex;
		try {
			if (!navigator.clipboard?.writeText) {
				throw new Error('Clipboard unavailable');
			}
			await navigator.clipboard.writeText(value);
			status.textContent = `Copied ${value}`;
		} catch {
			status.textContent = `Could not copy. Select and copy the hex code: ${value}`;
		}
	});
	actions.append(copy);
	if (saveTarget) {
		const save = createElement(doc, 'button', 'save-button', 'Use this color');
		save.type = 'button';
		save.addEventListener('click', async () => {
			save.disabled = true;
			status.textContent = `Saving ${selected.hex}…`;
			try {
				await submitTopColor(saveTarget, selected.hex);
			} catch {
				status.textContent = 'Could not save your color. Please try again.';
			} finally {
				save.disabled = false;
			}
		});
		actions.append(save);
	}
	inspector.append(sample, details, actions);
	section.append(inspector, status);

	const preview = (color: SpectrumColor): void => {
		sample.style.backgroundColor = color.hex;
		hex.textContent = color.hex;
		rank.textContent = `#${color.rank} in popularity`;
	};
	let selectedButton: HTMLButtonElement | null = null;
	const select = (color: SpectrumColor, button: HTMLButtonElement): void => {
		selectedButton?.setAttribute('aria-pressed', 'false');
		selected = color;
		selectedButton = button;
		button.setAttribute('aria-pressed', 'true');
		preview(color);
		previewTopbarColor(doc, color.hex);
		restoreHint();
	};
	const spectrum = arranged.filter(({ neutral }) => !neutral);
	const neutrals = arranged
		.filter(({ neutral }) => neutral)
		.sort((a, b) => b.luminance - a.luminance);
	for (const [paletteColors, neutral] of [
		[spectrum, false],
		[neutrals, true],
	] as const) {
		if (paletteColors.length === 0) {
			continue;
		}
		const heading = createElement(
			doc,
			'h2',
			'palette-heading',
			neutral ? 'The quiet tones' : 'The spectrum'
		);
		section.append(
			heading,
			createPalette(doc, paletteColors, neutral, preview, select, () => preview(selected))
		);
	}
	selectedButton = section.querySelector<HTMLButtonElement>(`[data-hex="${selected.hex}"]`);
	selectedButton?.setAttribute('aria-pressed', 'true');
	preview(selected);
	return section;
};

export const topcolorsTemplate = async (doc: Document): Promise<void> => {
	if (!window.location.pathname.startsWith('/topcolors')) {
		return;
	}

	const colors = extractTopColors(doc);
	const username = await dom.getUsername(doc.body);
	let saveTarget: TopColorSaveTarget | undefined;
	if (username) {
		try {
			saveTarget = await getTopColorSaveTarget(username);
		} catch (error) {
			console.error('Failed to load top color save target:', error);
		}
	}
	const container = findContentContainer(doc);
	if (!container) {
		return;
	}

	if (doc.getElementById(TOPCOLORS_ROOT_ID)) {
		return;
	}

	hideBody(doc);

	container.replaceChildren();
	const root = doc.createElement('div');
	root.id = TOPCOLORS_ROOT_ID;
	root.append(createTopcolorsTemplate(doc, colors, saveTarget));
	container.appendChild(root);

	showBody(doc);
};
