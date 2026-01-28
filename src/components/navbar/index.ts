import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import { moreLinks } from '@/components/navbar/more-links.ts';
import { paths } from '@/utils/paths.ts';
import type { ComponentFeature } from '@/utils/types.ts';

export const navbar: ComponentFeature = {
	id: 'navbar',
	loginRequired: true,
	matches: [`${paths.base}/*`],
	runAt: 'document_end',
	main(ctx: ContentScriptContext) {
		moreLinks(ctx, document);
	},
};
