import { type ContentScriptContext, defineContentScript } from '#imports';
import { activities } from '@/components/activities/index.ts';
import { comments } from '@/components/comment/index.ts';
import { footer } from '@/components/footer/index.ts';
import { navbar } from '@/components/navbar/index.ts';
import { past } from '@/components/past/index.ts';
import { story } from '@/components/story/index.ts';
import { submit } from '@/components/submit/index.ts';
import { user } from '@/components/user/index.ts';
import { createClientServices } from '@/services/manager.ts';
import { newActivityFetcher } from '@/utils/activity-trail.ts';
import { enableDarkMode } from '@/utils/dark-mode.ts';
import { dom } from '@/utils/dom.ts';
import { version } from '../../../package.json';
import './global.css';
import { common } from '@/components/common/index.ts';
import { loginTemplate } from '@/components/user/login-template.ts';
import { topcolorsTemplate } from '@/components/user/topcolors-template.tsx';

const components: ComponentFeature[] = [
	common,
	activities,
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

const startActivityFetcher = async (username: string | undefined): Promise<void> => {
	try {
		if (!username) {
			return;
		}

		const activityFetcher = newActivityFetcher(username);
		await activityFetcher.start();
	} catch (e) {
		console.error({ error: 'Failed to start activity fetcher', e });
	}
};

const runComponent = async (
	component: ComponentFeature,
	ctx: ContentScriptContext,
	currentUrl: string,
	username: string | undefined
): Promise<void> => {
	const hasMatchingPattern =
		Array.isArray(component.matches) &&
		component.matches.some((pattern) => urlMatchesPattern(currentUrl, pattern));
	if (!hasMatchingPattern) {
		return;
	}

	component.version = version;
	component.username = username;

	try {
		await component.main(ctx);
	} catch (e) {
		console.error({
			error: 'Failed to run component',
			e,
			stack: (e as Error).stack,
			component: component.id,
		});
	}
};

export default defineContentScript({
	matches: ['https://news.ycombinator.com/*'],
	runAt: 'document_end',
	async main(ctx: ContentScriptContext): Promise<void> {
		createClientServices();

		const currentUrl = window.location.href;
		const username = await dom.getUsername(document.body);
		const componentUsername = username ?? undefined;

		await topcolorsTemplate(document);
		loginTemplate(document, username ?? null);
		dom.ensureTopBarReadableText(document);
		await enableDarkMode();

		await Promise.all([
			startActivityFetcher(username),
			...components.map((component) =>
				runComponent(component, ctx, currentUrl, componentUsername)
			),
		]);
	},
});
