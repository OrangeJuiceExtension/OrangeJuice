const SHOW_PREFIX = 'Show HN: ';
const ASK_PREFIX = 'Ask HN: ';
const SUBMIT_LINK_TEXT = 'submit';
const SUBMIT_TITLE_SELECTOR = 'input[name="title"]';

const getTitlePrefixForPath = (pathname: string): string | null => {
	switch (pathname) {
		case '/show':
		case '/shownew': {
			return SHOW_PREFIX;
		}
		case '/ask':
		case '/asknew': {
			return ASK_PREFIX;
		}
		default: {
			return null;
		}
	}
};

const findSubmitLink = (doc: Document): HTMLAnchorElement | null => {
	const pagetop = doc.querySelector<HTMLElement>('span.pagetop');
	if (!pagetop) {
		return null;
	}

	for (const link of pagetop.querySelectorAll<HTMLAnchorElement>('a')) {
		if (link.innerText.trim().toLowerCase() === SUBMIT_LINK_TEXT) {
			return link;
		}
	}

	return null;
};

const updateSubmitLinkTitle = (doc: Document, titlePrefix: string): void => {
	const submitLink = findSubmitLink(doc);
	if (!submitLink) {
		return;
	}

	const submitUrl = new URL(submitLink.href, doc.location.origin);
	if (submitUrl.searchParams.has('title')) {
		return;
	}
	submitUrl.searchParams.set('title', titlePrefix);
	submitLink.href = submitUrl.toString();
};

const prefillSubmitTitle = (doc: Document): void => {
	const titleInput = doc.querySelector<HTMLInputElement>(SUBMIT_TITLE_SELECTOR);
	if (!titleInput) {
		return;
	}

	const title = new URLSearchParams(doc.location.search).get('title');
	titleInput.value = title ?? '';
};

export const prefill = (doc: Document): void => {
	const { pathname } = doc.location;
	if (pathname === '/submit') {
		prefillSubmitTitle(doc);
		return;
	}

	const titlePrefix = getTitlePrefixForPath(pathname);
	if (!titlePrefix) {
		return;
	}

	updateSubmitLinkTitle(doc, titlePrefix);
};
