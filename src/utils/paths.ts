const paths = {
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
	base: 'https://news.ycombinator.com',

	comments: ['/item', '/threads'],

	forms: ['/reply', '/submit', '/newpoll', '/edit', '/delete-confirm', '/submitlink'],

	info: [
		'/formatdoc',
		'/newsguidelines.html',
		'/newswelcome.html',
		'/newsfaq.html',
		'/security.html',
		'/bookmarklet.html',
		'/showhn.html',
	],

	misc: ['/leaders', '/user', '/topcolors', '/lists', '/flagged', '/following'],

	specialComments: ['/bestcomments', '/noobcomments', '/newcomments', '/highlights'],
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

	userSpecific: ['/submitted', '/hidden', '/upvoted', '/favorites'],
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
