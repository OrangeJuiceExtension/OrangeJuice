import { ActivityId, type ActivityType } from '@/utils/activity-trail.ts';
import { paths } from '@/utils/paths';

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

const getReplyIdFromLink = (link: HTMLAnchorElement): string => {
	const href = link.getAttribute('href') || '';
	const url = new URL(href, link.baseURI);
	return url.searchParams.get('id') || '';
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

	let actionLink = itemDiv.querySelector<HTMLAnchorElement>(`a[href*="${actionName}?id="]`);
	if (!actionLink) {
		// fall back to looking at the hide link. a job item only has that.
		// ie: https://news.ycombinator.com/item?id=46840801
		actionLink = itemDiv.querySelector<HTMLAnchorElement>(`a[href*="hide?id="]`);
	}
	return actionLink?.href.match(authMatchPattern)?.[1];
};

const getUsername = (doc: Document): string | undefined => {
	const userLink = doc.querySelector('span.pagetop a#me');
	return userLink?.textContent.split(' ')[0] || undefined;
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
	return [...doc.querySelectorAll<HTMLElement>('tr.comtr')];
};

const mapCommentsById = (comments: HTMLElement[]): Map<string, HTMLElement> => {
	return new Map(comments.map((el) => [el.id, el]));
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

export const dom = {
	getAuthToken,
	toggleActivityState,
	getAllComments,
	mapCommentsById,
	createHiddenInput,
	getHiddenInputValue,
	getReplyIdFromLink,
	getPageDom,
	fetchHmacFromPage,
	getUsername,
	getItemIdFromLocation,
	isClickModified,
	isComboKey,
	createOptions,
	elementPosition,
	elementInScrollView,
	getCommentIndentation,
	removeClassRecursive,
};
