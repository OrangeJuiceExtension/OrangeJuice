import type { ContentScriptContext } from '#imports';
import { hideReadStories } from '@/components/story/hide-read-stories.ts';
import { openInNewTab } from '@/components/story/open-in-new-tab.ts';
import { paths } from '@/utils/paths.ts';

export const story: ComponentFeature = {
	id: 'story',
	loginRequired: false,
	matches: [`${paths.base}/*`],
	runAt: 'document_end',
	main(ctx: ContentScriptContext) {
		return Promise.all([
			Promise.resolve().then(() => openInNewTab(ctx, document)),
			hideReadStories(ctx, document),
		]);
	},
};
