import HackerNews from './HackerNews.ts';

export default defineContentScript({
	matches: ['https://news.ycombinator.com/*'],
	runAt: 'document_end',
	main(ctx) {
		console.log('Hello content!');
		const hn = HackerNews(ctx);
		hn.processPage();
	},
});
