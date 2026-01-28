import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import { hideReadStories } from '@/components/story/hide-read-stories.ts';
import { paths } from '@/utils/paths.ts';

export const hideReadStoriesContent: ComponentFeature = {
	id: 'hide_read_stories',
	loginRequired: true,
	matches: [`${paths.base}/*`],
	runAt: 'document_end',
	async main(ctx: ContentScriptContext) {
		await hideReadStories(ctx, document);
	},
};
