import { ActivityId, type ActivityType } from '@/utils/activity-trail.ts';
import lStorage from '@/utils/local-storage.ts';
import { paths } from '@/utils/paths';

export const USERNAME_STORAGE_KEY = 'oj_username';
const TOP_BAR_READABLE_CLASS = 'oj-topbar-readable';
const TOP_BAR_COLOR_VARIABLE = '--oj-topbar-fg';
const DARK_COLOR_LUMINANCE_THRESHOLD = 0.22;
const TOP_BAR_DARK_TEXT_COLOR = '#111111';
const TOP_BAR_LIGHT_TEXT_COLOR = '#f1efec';
const SHORT_HEX_COLOR_PATTERN = /^#?([a-f0-9]{3})$/i;
const HEX_COLOR_PATTERN = /^#?([a-f0-9]{6})$/i;

const createHiddenInput = (name: string, value: string) => {
	const input = document.createElement('input');
	input.type = 'hidden';
	input.name = name;
	input.value = value;
	return input;
};

const getHiddenInputValue = (doc: Document, name: string) => {
	return doc.querySelector<HTMLInputElement>(`input[type="hidden"][name="${name}"]`)?.value || '';
};

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

const authMatchPattern = /auth=([^&]+)/;

const getAuthToken = async (
	commentId: string,
	activityType: ActivityType
): Promise<string | undefined> => {
	const actionName = getActivityActionName(activityType);
	if (!actionName) {
		return;
	}
	const itemPageUrl = `${paths.base}/item?id=${commentId}`;
	const itemDiv = await dom.getPageDom(itemPageUrl);
	if (!itemDiv) {
		return;
	}

	let token: string | undefined;

	const hmacInput = itemDiv.querySelector<HTMLInputElement>('input[type="hidden"][name="hmac"]');
	token = hmacInput?.value;

	if (!token) {
		let actionLink = itemDiv.querySelector<HTMLAnchorElement>(`a[href*="${actionName}?id="]`);
		if (!actionLink) {
			// fall back to looking at the hide link. a job item only has that.
			// ie: https://news.ycombinator.com/item?id=46840801
			actionLink = itemDiv.querySelector<HTMLAnchorElement>(`a[href*="hide?id="]`);
		}
		token = actionLink?.href.match(authMatchPattern)?.[1];
	}

	return token;
};

const getStoredUsername = async (): Promise<string | undefined> => {
	const stored = await lStorage.getItem<string>(USERNAME_STORAGE_KEY);
	return stored ?? undefined;
};

const setStoredUsername = async (username: string): Promise<void> => {
	await lStorage.setItem(USERNAME_STORAGE_KEY, username);
};

const getUsernameFromPage = (doc: HTMLElement): string | undefined => {
	const userLink = doc.querySelector<HTMLAnchorElement>('span.pagetop a[href*="user?id="]');
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

const parseRgbChannel = (value: string): number => {
	return Number.parseInt(value, 16);
};

const parseColorToRgb = (value: string): { r: number; g: number; b: number } | undefined => {
	const color = value.trim();
	const shortHexMatch = color.match(SHORT_HEX_COLOR_PATTERN);
	if (shortHexMatch) {
		const [r, g, b] = shortHexMatch[1].split('');
		return {
			r: parseRgbChannel(`${r}${r}`),
			g: parseRgbChannel(`${g}${g}`),
			b: parseRgbChannel(`${b}${b}`),
		};
	}

	const hexMatch = color.match(HEX_COLOR_PATTERN);
	if (hexMatch) {
		return {
			r: parseRgbChannel(hexMatch[1].slice(0, 2)),
			g: parseRgbChannel(hexMatch[1].slice(2, 4)),
			b: parseRgbChannel(hexMatch[1].slice(4, 6)),
		};
	}

	return undefined;
};

const srgbToLinear = (channel: number): number => {
	const normalized = channel / 255;
	if (normalized <= 0.040_45) {
		return normalized / 12.92;
	}
	return ((normalized + 0.055) / 1.055) ** 2.4;
};

const isDarkColor = (value: string): boolean => {
	const rgb = parseColorToRgb(value);
	if (!rgb) {
		return false;
	}
	const luminance =
		0.2126 * srgbToLinear(rgb.r) + 0.7152 * srgbToLinear(rgb.g) + 0.0722 * srgbToLinear(rgb.b);
	return luminance < DARK_COLOR_LUMINANCE_THRESHOLD;
};

const getTopBarCell = (doc: Document): HTMLTableCellElement | undefined => {
	const cell =
		doc.querySelector<HTMLTableCellElement>('#hnmain > tbody > tr:first-child > td[bgcolor]') ??
		doc.querySelector<HTMLTableCellElement>('#hnmain > tr:first-child > td[bgcolor]');
	return cell ?? undefined;
};

const removeTopBarTextOverride = (doc: Document): void => {
	doc.documentElement.classList.remove(TOP_BAR_READABLE_CLASS);
	doc.documentElement.style.removeProperty(TOP_BAR_COLOR_VARIABLE);
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
			return undefined;
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

	const url = isActive
		? `${paths.base}/${actionName}?id=${commentId}&un=t&auth=${authToken}`
		: `${paths.base}/${actionName}?id=${commentId}&auth=${authToken}`;

	const response = await fetch(url, {
		method: 'GET',
		credentials: 'include',
		redirect: 'manual',
	});

	if (!response.ok && response.status !== 302 && response.status !== 0) {
		console.log({
			error: 'Failed to toggle state for comment',
			actionName,
			commentId,
			status: response.status,
			statusText: response.statusText,
		});
	}

	return true;
};

const getAllComments = (doc: Document): HTMLElement[] => {
	return [...doc.querySelectorAll<HTMLElement>('tr.athing')];
};

const mapElementsById = (elements: HTMLElement[]): Map<string, HTMLElement> => {
	return new Map(elements.map((el) => [el.id, el]));
};

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
	getAuthToken,
	toggleActivityState,
	getAllComments,
	mapElementsById,
	createHiddenInput,
	getHiddenInputValue,
	getPageDom,
	fetchHmacFromPage,
	getUsername,
	ensureTopBarReadableText,
	getItemIdFromLocation,
	isClickModified,
	isComboKey,
	createOptions,
	elementPosition,
	elementInScrollView,
	getCommentIndentation,
	removeClassRecursive,
	newReplyTextareasObserver,
};
