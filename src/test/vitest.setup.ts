const NEWS_STYLESHEET_URL_PREFIX = 'http://localhost:3000/news.css';

const originalFetch = globalThis.fetch.bind(globalThis);

const getFetchUrl = (input: RequestInfo | URL): string => {
	if (typeof input === 'string') {
		return input;
	}

	if (input instanceof URL) {
		return input.href;
	}

	return input.url;
};

globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
	const url = getFetchUrl(input);

	if (url.startsWith(NEWS_STYLESHEET_URL_PREFIX)) {
		return Promise.resolve(
			new Response('', {
				headers: {
					'Content-Type': 'text/css; charset=utf-8',
				},
				status: 200,
			})
		);
	}

	return originalFetch(input, init);
};
