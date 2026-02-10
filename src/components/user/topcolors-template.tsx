import { createRoot } from 'react-dom/client';
import { hideBody, showBody } from '@/components/common/hide-body.ts';
import { dom } from '@/utils/dom.ts';
import './topcolors-template.css';

const TOPCOLORS_ROOT_ID = 'oj-topcolors-root';

interface TopColor {
	hex: string;
	href: string;
}

interface TopColorSaveTarget {
	formValues: URLSearchParams;
	submitAction: URL;
	submitMethod: string;
}

const SWATCH_SHAPES = ['circle', 'pill', 'diamond', 'squircle', 'hex'] as const;
type SwatchShape = (typeof SWATCH_SHAPES)[number];

const HEX_REGEX = /#?([0-9a-f]{6})/i;

const TOAST_ID = 'oj-topcolors-toast';
const TOAST_VISIBLE_CLASS = 'oj-topcolors__toast--visible';
const TOAST_HIDE_DELAY_MS = 1400;
const TOP_COLOR_FIELD_NAME = 'topc';
const FORM_SKIP_INPUT_TYPES = new Set(['button', 'file', 'image', 'reset', 'submit']);

let toastTimeout: number | undefined;

const pickRandomShape = (): (typeof SWATCH_SHAPES)[number] => {
	const index = Math.floor(Math.random() * SWATCH_SHAPES.length);
	return SWATCH_SHAPES[index];
};

const normalizeHex = (value: string): string | null => {
	const match = value.match(HEX_REGEX);
	if (!match) {
		return null;
	}
	return `#${match[1].toLowerCase()}`;
};

const showCopyToast = (doc: Document, value: string, shape: SwatchShape) => {
	let toast = doc.getElementById(TOAST_ID) as HTMLDivElement | null;
	if (!toast) {
		toast = doc.createElement('div');
		toast.id = TOAST_ID;
		toast.className = 'oj-topcolors__toast';
		doc.body.appendChild(toast);
	}

	toast.replaceChildren();

	const toastContent = doc.createElement('span');
	toastContent.className = 'oj-topcolors__toast-content';

	const swatch = doc.createElement('span');
	swatch.className = `oj-topcolors__swatch oj-topcolors__swatch--${shape} oj-topcolors__toast-swatch`;
	swatch.style.backgroundColor = value;

	const label = doc.createElement('span');
	label.textContent = `Copied ${value}`;

	toastContent.append(swatch, label);
	toast.appendChild(toastContent);
	toast.classList.add(TOAST_VISIBLE_CLASS);

	if (toastTimeout) {
		window.clearTimeout(toastTimeout);
	}

	toastTimeout = window.setTimeout(() => {
		toast?.classList.remove(TOAST_VISIBLE_CLASS);
	}, TOAST_HIDE_DELAY_MS);
};

const copyToClipboard = async (_doc: Document, value: string): Promise<boolean> => {
	if (!navigator.clipboard?.writeText) {
		return false;
	}

	await navigator.clipboard.writeText(value);
	return true;
};

const formatTopColorForUserForm = (value: string): string => {
	return value.replace('#', '').toUpperCase();
};

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
		return undefined;
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
		return undefined;
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

	await fetch(target.submitAction.toString(), {
		method: target.submitMethod,
		body: submitBody,
		cache: 'no-store',
		redirect: 'manual',
		credentials: 'include',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
		},
	});

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

		deduped.set(hex, { hex, href: isAnchor ? source.href : doc.location.href });
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

const TopcolorsTemplate = ({
	colors,
	saveTarget,
}: {
	colors: TopColor[];
	saveTarget?: TopColorSaveTarget;
}) => (
	<section className="oj-topcolors">
		<header className="oj-topcolors__intro">
			<h1 className="oj-topcolors__title">Top Colors</h1>
			<p className="oj-topcolors__subtitle">
				Browse Hacker News themes by color. {colors.length} colors available.
			</p>
		</header>
		<ol className="oj-topcolors__list">
			{colors.map((color, index) => {
				const shape = pickRandomShape();

				return (
					<li className="oj-topcolors__item" key={color.hex}>
						<div className="oj-topcolors__card-shell">
							<a
								className="oj-topcolors__card"
								href={color.href}
								onClick={async (event) => {
									event.preventDefault();
									const didCopy = await copyToClipboard(document, color.hex);
									if (didCopy) {
										showCopyToast(document, color.hex, shape);
									}
								}}
							>
								<span className="oj-topcolors__rank">{index + 1}</span>
								<span
									className={`oj-topcolors__swatch oj-topcolors__swatch--${shape}`}
									style={{ backgroundColor: color.hex }}
								/>
								<span className="oj-topcolors__meta">
									<span className="oj-topcolors__hex">{color.hex}</span>
								</span>
							</a>
							{saveTarget ? (
								<button
									aria-label={`Save ${color.hex} as top color`}
									className="oj-topcolors__save-button"
									onClick={async (event) => {
										event.preventDefault();
										event.stopPropagation();
										await submitTopColor(saveTarget, color.hex);
									}}
									title={`Save ${color.hex}`}
									type="button"
								>
									<svg
										aria-hidden="true"
										className="oj-topcolors__save-icon"
										focusable="false"
										viewBox="0 0 16 16"
									>
										<path
											d="M2 2h9l3 3v9H2z"
											fill="none"
											stroke="currentColor"
										/>
										<path
											d="M5 2h5v4H5zM5 9h6v4H5z"
											fill="none"
											stroke="currentColor"
										/>
									</svg>
								</button>
							) : null}
						</div>
					</li>
				);
			})}
		</ol>
	</section>
);

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
	container.appendChild(root);
	createRoot(root).render(<TopcolorsTemplate colors={colors} saveTarget={saveTarget} />);

	showBody(doc);
};
