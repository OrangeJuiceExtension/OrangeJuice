import type { ContentScriptContext } from '#imports';
import { openInNewTab } from '@/components/common/open-in-new-tab.ts';
import { paths } from '@/utils/paths.ts';

export const common: ComponentFeature = {
	id: 'common',
	loginRequired: false,
	matches: [`${paths.base}/*`],
	runAt: 'document_end',
	main(ctx: ContentScriptContext) {
		return Promise.all([Promise.resolve().then(() => openInNewTab(ctx, document))]);
	},
};
