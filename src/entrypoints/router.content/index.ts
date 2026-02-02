import { type ContentScriptContext, defineContentScript } from '#imports';
import { activities } from '@/components/activities/index.ts';
import { comments } from '@/components/comment/index.ts';
import { footer } from '@/components/footer/index.ts';
import { navbar } from '@/components/navbar/index.ts';
import { past } from '@/components/past/index.ts';
import { remaining } from '@/components/remaining/index.ts';
import { story } from '@/components/story/index.ts';
import { submit } from '@/components/submit/index.ts';
import { user } from '@/components/user/index.ts';
import { createClientServices } from '@/services/manager.ts';
import { newActivityFetcher } from '@/utils/activity-trail.ts';
import { dom } from '@/utils/dom.ts';

import { version } from '../../../package.json';
import './global.css';
import { common } from '@/components/common/index.ts';

const components: ComponentFeature[] = [
	common,
	activities,
	remaining,
	comments,
	submit,
	user,
	past,
	navbar,
	footer,
	story,
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
		createClientServices();
		const username = dom.getUsername(document.body);

		await Promise.all([
			Promise.resolve().then(async () => {
				try {
					if (username) {
						const activityFetcher = newActivityFetcher(username);
						await activityFetcher.start();
					}
				} catch (e) {
					console.error({ error: 'Failed to start activity fetcher', e });
					return;
				}
			}),
			...components.map((component) =>
				Promise.resolve().then(async () => {
					let shouldRun = false;
					for (const pattern of component?.matches as string[]) {
						if (urlMatchesPattern(currentUrl, pattern)) {
							shouldRun = true;
							break;
						}
					}

					if (shouldRun) {
						try {
							component.version = version;
							component.username = username;
							await component.main(ctx);
						} catch (e) {
							console.error({
								error: 'Failed to run component',
								e,
								component: component.id,
							});
						}
					}
				})
			),
		]);
	},
});
