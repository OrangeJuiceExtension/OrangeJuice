const paths = {
	base: 'https://news.ycombinator.com',
	stories: [
		'/',
		'/newest',
		'/news',
		'/show',
		'/shownew',
		'/ask',
		'/jobs',
		'/active',
		'/best',
		'/classic',
		'/noobstories',
		'/front',
		'/from',
		'/over',
		'/pool',
		'/launches',
	],

	comments: ['/item', '/threads'],

	specialComments: ['/bestcomments', '/noobcomments', '/newcomments', '/highlights'],

	userSpecific: ['/submitted', '/hidden', '/upvoted', '/favorites'],

	forms: ['/reply', '/submit', '/newpoll', '/edit', '/delete-confirm', '/submitlink'],

	misc: ['/leaders', '/user', '/topcolors', '/lists', '/flagged', '/following'],

	actions: [
		'/login',
		'/changepw',
		'/reply',
		'/vote',
		'/flag',
		'/fave',
		'/hide',
		'/deadlink',
		'/xuser',
		'/x',
		'/r',
	],

	info: [
		'/formatdoc',
		'/newsguidelines.html',
		'/newswelcome.html',
		'/newsfaq.html',
		'/security.html',
		'/bookmarklet.html',
		'/showhn.html',
	],
};

interface RuntimeUrlApi {
	browser?: {
		runtime?: {
			getURL?: (path: string) => string;
		};
	};
	chrome?: {
		runtime?: {
			getURL?: (path: string) => string;
		};
	};
}

export const getFollowingPageUrl = (): string => {
	const runtimeApi = globalThis as typeof globalThis & RuntimeUrlApi;

	return (
		runtimeApi.browser?.runtime?.getURL?.('/following.html') ??
		runtimeApi.chrome?.runtime?.getURL?.('/following.html') ??
		'/following.html'
	);
};

export { paths };
