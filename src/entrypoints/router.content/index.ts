import { type ContentScriptContext, defineContentScript } from '#imports';
import { activities } from '@/components/activities/index.ts';
import { comments } from '@/components/comment/index.ts';
import { footer } from '@/components/footer/index.ts';
import { navbar } from '@/components/navbar/index.ts';
import { past } from '@/components/past/index.ts';
import { remaining } from '@/components/remaining/index.ts';
import { inlineReply } from '@/components/reply/index.ts';
import { story } from '@/components/story/index.ts';
import { submit } from '@/components/submit/index.ts';
import { user } from '@/components/user/index.ts';
import { newActivityFetcher } from '@/utils/activity-trail.ts';
import { dom } from '@/utils/dom.ts';

import { version } from '../../../package.json';
import './global.css';

const components = [
	inlineReply,
	activities,
	remaining,
	story,
	comments,
	submit,
	user,
	past,
	navbar,
	footer,
];

const urlMatchesPattern = (url: string, pattern: string): boolean => {
	// Convert glob pattern to regex
	const regexPattern = pattern
		.replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
		.replace(/\*/g, '.*') // Convert * to .*
		.replace(/\?/g, '.'); // Convert ? to '.'

	return new RegExp(`^${regexPattern}$`).test(url);
};

export default defineContentScript({
	matches: ['https://news.ycombinator.com/*'],
	runAt: 'document_end',
	async main(ctx: ContentScriptContext): Promise<void> {
		const currentUrl = window.location.href;

		await Promise.all([
			Promise.resolve().then(async () => {
				try {
					const username = dom.getUsername(document);
					if (username) {
						const activityFetcher = newActivityFetcher(username);
						await activityFetcher.start();
					}
				} catch (e) {
					console.error({ error: 'Failed to start activity fetcher', e });
					return;
				}
			}),
			Promise.resolve().then(() => {
				for (const component of components) {
					let shouldRun = false;
					for (const pattern of component?.matches as string[]) {
						if (urlMatchesPattern(currentUrl, pattern)) {
							shouldRun = true;
							break;
						}
					}

					if (shouldRun) {
						component.version = version;
						component.main(ctx);
					}
				}
			}),
		]);
	},
});
