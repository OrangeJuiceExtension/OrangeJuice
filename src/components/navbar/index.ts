import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import { moreLinksDropdown } from '@/components/navbar/more-links-dropdown.ts';
import { paths } from '@/utils/paths.ts';
import type { ComponentFeature } from '@/utils/types.ts';

export const navbar: ComponentFeature = {
	id: 'navbar',
	loginRequired: true,
	matches: [`${paths.base}/*`],
	runAt: 'document_end',
	main(ctx: ContentScriptContext) {
		moreLinksDropdown(ctx, document);
	},
};
