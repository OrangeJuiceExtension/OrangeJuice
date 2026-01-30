import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { comments } from '@/components/comment/index.ts';
import { favorite } from '@/components/favorite/index.ts';
import { flag } from '@/components/flag/index.ts';
import { navbar } from '@/components/navbar/index.ts';
import { past } from '@/components/past/index.ts';
import { remaining } from '@/components/remaining/index.ts';
import { inlineReply } from '@/components/reply/index.ts';
import { story } from '@/components/story/index.ts';
import { submit } from '@/components/submit/index.ts';
import { user } from '@/components/user/index.ts';
import './global.css';

const components = [
	inlineReply,
	favorite,
	flag,
	remaining,
	story,
	comments,
	submit,
	user,
	past,
	navbar,
];

const urlMatchesPattern = (url: string, pattern: string): boolean => {
	// Convert glob pattern to regex
	const regexPattern = pattern
		.replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
		.replace(/\*/g, '.*') // Convert * to .*
		.replace(/\?/g, '.'); // Convert ? to .

	return new RegExp(`^${regexPattern}$`).test(url);
};

export default defineContentScript({
	matches: ['https://news.ycombinator.com/*'],
	runAt: 'document_end',
	main(ctx: ContentScriptContext): void {
		const currentUrl = window.location.href;

		for (const component of components) {
			let shouldRun = false;
			for (const pattern of component?.matches as string[]) {
				if (urlMatchesPattern(currentUrl, pattern)) {
					shouldRun = true;
					break;
				}
			}

			if (shouldRun) {
				component.main(ctx);
			}
		}
	},
});
