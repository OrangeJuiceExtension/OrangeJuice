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

	const response = await fetch(url, { cache });
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

export const dom = {
	createHiddenInput,
	getHiddenInputValue,
	getReplyIdFromLink,
	getPageDom,
	fetchHmacFromPage,
	getUsername,
};
