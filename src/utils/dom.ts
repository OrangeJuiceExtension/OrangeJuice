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

	const div = document.createElement('div');
	div.innerHTML = html;
	return div;
};

const fetchHmacFromPage = async (url: string): Promise<string> => {
	const div = await getPageDom(url);
	if (div) {
		const hmacInput = div.querySelector<HTMLInputElement>('input[type="hidden"][name="hmac"]');
		return hmacInput?.value || '';
	}
	return '';
};

const getUsername = (doc: Document): string | undefined => {
	const userLink = doc.querySelector('span.pagetop a#me');
	return userLink?.textContent || undefined;
};

const getAllComments = (doc: Document): HTMLElement[] => {
	return [...doc.querySelectorAll<HTMLElement>('tr.comtr')];
};

const getItemIdFromLocation = (): string | null => {
	const url = new URL(window.location.href);
	return url.searchParams.get('id');
};

const injectLinkButtonStyle = (doc: Document) => {
	const style = doc.createElement('style');
	style.textContent = `
		.oj-link-button {
			background: none;
			border: none;
			padding: 0;
			color: inherit;
			text-decoration: none;
			cursor: pointer;
			font: inherit;
		}
		.oj-link-button:hover {
			text-decoration: underline;
	}`;
	doc.head.appendChild(style);
};

export interface FetchRemoteService {
	getPageDom(url: string): Promise<HTMLElement | undefined> | undefined;
	fetchJson<T>(url: string): Promise<T | undefined>;
}

export const createFetchRemoteService = () => {
	return {
		getPageDom(url: string): Promise<HTMLElement | undefined> | undefined {
			try {
				return dom.getPageDom(url);
			} catch (e) {
				console.error('Error in FetchRemoteService:', e);
			}
			return undefined;
		},
		async fetchJson<T>(url: string): Promise<T | undefined> {
			try {
				const response = await fetch(url, { cache: 'force-cache' });
				return response.json();
			} catch (e) {
				console.error('Error in FetchRemoteService:', e);
			}
			return undefined;
		},
	};
};

export function isClickModified(event: MouseEvent) {
	return (
		Boolean(event.button) || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey
	);
}

export const createOptions = (start: number, end: number, step: number, selectedValue: number) => {
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

export const elementPosition = (doc: Document, el: HTMLElement) => {
	const bodyRect = doc.body.getBoundingClientRect();
	const rect = el.getBoundingClientRect();
	const top = rect.top - bodyRect.top;
	return { x: rect.left, y: top };
};

export const dom = {
	injectLinkButtonStyle,
	getAllComments,
	createHiddenInput,
	getHiddenInputValue,
	getReplyIdFromLink,
	getPageDom,
	fetchHmacFromPage,
	getUsername,
	getItemIdFromLocation,
	isClickModified,
	createOptions,
	elementPosition,
};
