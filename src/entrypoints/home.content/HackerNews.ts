import { ContentScriptContext } from 'wxt/utils/content-script-context';

export interface HackerNews {
	processPage: () => void;
	ctx: ContentScriptContext;
}

export default function HackerNews(ctx: ContentScriptContext) {
	return {
		ctx: ctx,
		processPage: () => {
			console.log(document.title);
		},
	};
}
