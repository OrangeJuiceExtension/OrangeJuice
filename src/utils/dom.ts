import { ActivityId, type ActivityType } from '@/utils/activity-trail.ts';
import { getRelativeLuminance } from '@/utils/color-luminance.ts';
import lStorage from '@/utils/local-storage.ts';
import { paths } from '@/utils/paths';

export const USERNAME_STORAGE_KEY = 'oj_username';
const TOP_BAR_READABLE_CLASS = 'oj-topbar-readable';
const TOP_BAR_COLOR_VARIABLE = '--oj-topbar-fg';
const TOP_BAR_CELL_CLASS = 'oj-topbar-cell';
const DARK_COLOR_LUMINANCE_THRESHOLD = 0.22;
const TOP_BAR_DARK_TEXT_COLOR = '#111111';
const TOP_BAR_LIGHT_TEXT_COLOR = '#f1efec';
const SHORT_HEX_COLOR_PATTERN = /^#?([a-f0-9]{3})$/i;
const HEX_COLOR_PATTERN = /^#?([a-f0-9]{6})$/i;
const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308]);
const NON_TEXT_INPUT_TYPES = new Set([
	'button',
	'checkbox',
	'color',
	'file',
	'hidden',
	'image',
	'radio',
	'range',
	'reset',
	'submit',
]);

const createHiddenInput = (name: string, value: string) => {
	const input = document.createElement('input');
	input.type = 'hidden';
	input.name = name;
	input.value = value;
	return input;
};

const getHiddenInputValue = (doc: Document, name: string) =>
	doc.querySelector<HTMLInputElement>(`input[type="hidden"][name="${name}"]`)?.value || '';

const getPageDom = async (
	url: string,
	cache: RequestCache | undefined = 'force-cache'
): Promise<HTMLElement | undefined> => {
	if (!navigator.onLine) {
		return;
	}

	let fixedUrl: string = url;
	if (!(url.startsWith('http') || url.startsWith('/'))) {
		fixedUrl = `${paths.base}/${url}`;
	}
	const response = await fetch(fixedUrl, { cache });
	const html = await response.text();
	const parser = new DOMParser();
	const doc = parser.parseFromString(html, 'text/html');
	return doc.body;
};

const fetchHmacFromPage = async (url: string): Promise<string> => {
	const div = await getPageDom(url);
	if (div) {
		const hmacInput = div.querySelector<HTMLInputElement>('input[type="hidden"][name="hmac"]');
		return hmacInput?.value || '';
	}
	return '';
};

const getHrefQueryParam = (
	href: string,
	param: string,
	baseUrl = paths.base
): string | undefined => {
	const url = new URL(href, baseUrl);
	return url.searchParams.get(param) ?? undefined;
};

const findLinkByPathnameAndQueryParam = (
	root: ParentNode,
	selector: string,
	pathname: string,
	param: string,
	value?: string,
	baseUrl = paths.base
): HTMLAnchorElement | undefined => {
	const candidates = root.querySelectorAll<HTMLAnchorElement>(selector);

	for (const candidate of candidates) {
		const href = candidate.getAttribute('href');
		if (!href) {
			continue;
		}

		const url = new URL(href, baseUrl);
		if (url.pathname !== pathname) {
			continue;
		}

		const paramValue = url.searchParams.get(param);
		if (paramValue && (value === undefined || paramValue === value)) {
			return candidate;
		}
	}
};

const findUserLink = (root: ParentNode): HTMLAnchorElement | undefined =>
	findLinkByPathnameAndQueryParam(root, 'span.pagetop a', '/user', 'id');

const findActivityLink = (
	root: ParentNode,
	actionName: string,
	itemId: string
): HTMLAnchorElement | undefined =>
	findLinkByPathnameAndQueryParam(
		root,
		`a[href*="${actionName}?"]`,
		`/${actionName}`,
		'id',
		itemId
	);

const getAuthToken = async (
	commentId: string,
	activityType: ActivityType
): Promise<string | undefined> => {
	const actionName = getActivityActionName(activityType);
	if (!actionName) {
		return;
	}
	const itemPageUrl = `${paths.base}/item?id=${encodeURIComponent(commentId)}`;
	const itemDiv = await dom.getPageDom(itemPageUrl, 'no-store');
	if (!itemDiv) {
		return;
	}

	// The reply form's hmac authorizes comments, not favorite/flag actions.
	// Job items may only expose the item's action token in their hide link.
	const actionLink =
		findActivityLink(itemDiv, actionName, commentId) ??
		findActivityLink(itemDiv, 'hide', commentId);
	const href = actionLink?.getAttribute('href');
	return href ? getHrefQueryParam(href, 'auth') : undefined;
};

const getStoredUsername = async (): Promise<string | undefined> => {
	const stored = await lStorage.getItem<string>(USERNAME_STORAGE_KEY);
	return stored ?? undefined;
};

const setStoredUsername = async (username: string): Promise<void> => {
	await lStorage.setItem(USERNAME_STORAGE_KEY, username);
};

const getUsernameFromPage = (doc: HTMLElement): string | undefined => {
	const userLink = findUserLink(doc);
	const username = userLink?.textContent.split(' ')[0];
	return username || undefined;
};

const getUsername = async (doc: HTMLElement): Promise<string | undefined> => {
	const usernameFromPage = getUsernameFromPage(doc);
	if (usernameFromPage) {
		const storedUsername = await getStoredUsername();
		if (storedUsername !== usernameFromPage) {
			await setStoredUsername(usernameFromPage);
		}
		return usernameFromPage;
	}

	return getStoredUsername();
};

const getItemAuthor = (doc: Document): string | undefined => {
	const itemAuthorLink = doc.querySelector<HTMLAnchorElement>('table.fatitem a.hnuser');
	return itemAuthorLink?.textContent || undefined;
};

const parseRgbChannel = (value: string): number => Number.parseInt(value, 16);

const parseColorToRgb = (value: string): { r: number; g: number; b: number } | undefined => {
	const color = value.trim();
	const shortHex = color.match(SHORT_HEX_COLOR_PATTERN)?.[1];
	if (shortHex) {
		const r = shortHex.charAt(0);
		const g = shortHex.charAt(1);
		const b = shortHex.charAt(2);
		return {
			b: parseRgbChannel(`${b}${b}`),
			g: parseRgbChannel(`${g}${g}`),
			r: parseRgbChannel(`${r}${r}`),
		};
	}

	const hex = color.match(HEX_COLOR_PATTERN)?.[1];
	if (hex) {
		return {
			b: parseRgbChannel(hex.slice(4, 6)),
			g: parseRgbChannel(hex.slice(2, 4)),
			r: parseRgbChannel(hex.slice(0, 2)),
		};
	}
};

const isDarkColor = (value: string): boolean => {
	const rgb = parseColorToRgb(value);
	if (!rgb) {
		return false;
	}
	return getRelativeLuminance(rgb.r, rgb.g, rgb.b) < DARK_COLOR_LUMINANCE_THRESHOLD;
};

const getTopBarCell = (doc: Document): HTMLTableCellElement | undefined => {
	const firstPageTop = doc.querySelector<HTMLElement>('span.pagetop');
	const pageTopCell = firstPageTop?.closest<HTMLTableCellElement>('td[bgcolor]');
	if (pageTopCell) {
		return pageTopCell;
	}

	const cell =
		doc.querySelector<HTMLTableCellElement>('#hnmain > tbody > tr:first-child > td[bgcolor]') ??
		doc.querySelector<HTMLTableCellElement>('#hnmain > tr:first-child > td[bgcolor]');
	return cell ?? undefined;
};

const removeTopBarTextOverride = (doc: Document): void => {
	doc.documentElement.classList.remove(TOP_BAR_READABLE_CLASS);
	doc.documentElement.style.removeProperty(TOP_BAR_COLOR_VARIABLE);

	for (const cell of doc.querySelectorAll<HTMLElement>(`.${TOP_BAR_CELL_CLASS}`)) {
		cell.classList.remove(TOP_BAR_CELL_CLASS);
	}
};

const ensureTopBarReadableText = (doc: Document): void => {
	const topBarCell = getTopBarCell(doc);
	const backgroundColor = topBarCell?.getAttribute('bgcolor');
	if (!(topBarCell && backgroundColor)) {
		removeTopBarTextOverride(doc);
		return;
	}

	const textColor = isDarkColor(backgroundColor)
		? TOP_BAR_LIGHT_TEXT_COLOR
		: TOP_BAR_DARK_TEXT_COLOR;
	topBarCell.classList.add(TOP_BAR_CELL_CLASS);
	doc.documentElement.classList.add(TOP_BAR_READABLE_CLASS);
	doc.documentElement.style.setProperty(TOP_BAR_COLOR_VARIABLE, textColor);
};

const getActivityActionName = (type: ActivityType): 'fave' | 'flag' | undefined => {
	switch (type) {
		case ActivityId.FavoriteComments:
		case ActivityId.FavoriteSubmissions:
			return 'fave';
		case ActivityId.FlagsComments:
		case ActivityId.FlagsSubmissions:
			return 'flag';
		default:
			return;
	}
};

const toggleActivityState = async (
	commentId: string,
	isActive: boolean,
	authToken: string,
	activityType: ActivityType
): Promise<boolean | undefined> => {
	const actionName = getActivityActionName(activityType);
	if (!actionName) {
		return;
	}

	const url = new URL(`/${actionName}`, paths.base);
	url.searchParams.set('id', commentId);
	url.searchParams.set('auth', authToken);
	if (isActive) {
		url.searchParams.set('un', 't');
	}

	const response = await fetch(url.href, {
		cache: 'no-store',
		credentials: 'include',
		method: 'GET',
		redirect: 'manual',
	});

	if (response.type === 'opaqueredirect' || REDIRECT_STATUS_CODES.has(response.status)) {
		return true;
	}

	if (!response.ok) {
		console.log({
			actionName,
			commentId,
			error: 'Failed to toggle state for comment',
			status: response.status,
			statusText: response.statusText,
		});
		return false;
	}

	// HN can return an error page with HTTP 200. Only accept a page that shows
	// the reverse action for this item, confirming that its state changed.
	const html = await response.text();
	const doc = new DOMParser().parseFromString(html, 'text/html');
	const actionLink = findActivityLink(doc, actionName, commentId);
	const href = actionLink?.getAttribute('href');
	if (!href) {
		return false;
	}
	const nowActive = getHrefQueryParam(href, 'un') === 't';
	return nowActive !== isActive;
};

const getAllComments = (doc: Document): HTMLElement[] => [
	...doc.querySelectorAll<HTMLElement>('tr.athing.comtr'),
];

const mapElementsById = (elements: HTMLElement[]): Map<string, HTMLElement> =>
	new Map(elements.map((el) => [el.id, el]));

const getItemIdFromLocation = (): string | null => {
	const url = new URL(window.location.href);
	return url.searchParams.get('id');
};

function isClickModified(event: MouseEvent) {
	return (
		Boolean(event.button) || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey
	);
}

function isComboKey(event: KeyboardEvent) {
	return event.ctrlKey || event.metaKey || event.shiftKey || event.altKey;
}

function isEditableField(element?: Element | null) {
	if (!(element instanceof HTMLElement)) {
		return false;
	}

	if (element instanceof HTMLTextAreaElement) {
		return true;
	}

	if (element instanceof HTMLInputElement) {
		const inputType = element.type.toLowerCase();
		return !NON_TEXT_INPUT_TYPES.has(inputType);
	}

	return element.isContentEditable;
}

const createOptions = (start: number, end: number, step: number, selectedValue: number) => {
	const options: HTMLOptionElement[] = [];
	for (let i = start; step > 0 ? i <= end : i >= end; i += step) {
		const option = document.createElement('option');
		if (i === selectedValue) {
			option.selected = true;
		}
		option.value = `${i}`;
		option.textContent = String(i).padStart(2, '0');
		options.push(option);
	}
	return options;
};

const elementPosition = (doc: Document, el: HTMLElement) => {
	const bodyRect = doc.body.getBoundingClientRect();
	const rect = el.getBoundingClientRect();
	const top = rect.top - bodyRect.top;
	return { x: rect.left, y: top };
};

// From: https://stackoverflow.com/a/22480938
function elementInScrollView(el: HTMLElement) {
	const rect = el.getBoundingClientRect();
	const elemTop = rect.top;
	const elemBottom = rect.bottom;

	return elemTop >= 0 && elemBottom <= window.innerHeight;
}

function removeClassRecursive(node: HTMLElement, classNames: string | string[]) {
	const classesToRemove = Array.isArray(classNames) ? classNames : [classNames];
	for (const className of classesToRemove) {
		node.classList.remove(className);
	}
	for (const child of node.children) {
		removeClassRecursive(child as HTMLElement, classNames);
	}
}

function getCommentIndentation(element: HTMLElement): {
	element?: HTMLImageElement;
	width?: number;
} {
	const img = element?.querySelector('.ind img') as HTMLImageElement | undefined;
	return img
		? {
				element: img,
				width: img.width / 40,
			}
		: {
				element: undefined,
				width: undefined,
			};
}

function newReplyTextareasObserver(callback: (e: KeyboardEvent) => void) {
	const mainTable = document.querySelector('table#hnmain');

	if (paths.comments.includes(window.location.pathname) && mainTable) {
		const observer = new MutationObserver((mutationsList) => {
			for (const mutation of mutationsList) {
				const { addedNodes } = mutation;
				for (const node of addedNodes) {
					if (node.nodeType !== Node.ELEMENT_NODE) {
						continue;
					}

					const textarea = (node as HTMLElement).querySelector('textarea');
					if (textarea) {
						textarea.addEventListener('keydown', callback);
					}
				}
			}
		});

		const observerConfig = {
			attributes: false,
			childList: true,
			subtree: true,
		};

		observer.observe(mainTable, observerConfig);
		return observer;
	}
}

export const dom = {
	createHiddenInput,
	createOptions,
	elementInScrollView,
	elementPosition,
	ensureTopBarReadableText,
	fetchHmacFromPage,
	findLinkByPathnameAndQueryParam,
	getAllComments,
	getAuthToken,
	getCommentIndentation,
	getHiddenInputValue,
	getHrefQueryParam,
	getItemAuthor,
	getItemIdFromLocation,
	getPageDom,
	getUsername,
	isClickModified,
	isComboKey,
	isEditableField,
	mapElementsById,
	newReplyTextareasObserver,
	removeClassRecursive,
	toggleActivityState,
};
