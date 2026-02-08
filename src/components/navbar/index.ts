import type { ContentScriptContext } from '#imports';
import { darkModeToggle } from '@/components/navbar/dark-mode-toggle.ts';
import { moreLinksDropdown } from '@/components/navbar/more-links-dropdown.ts';
import { paths } from '@/utils/paths.ts';
import type { ComponentFeature } from '@/utils/types.ts';

export const navbar: ComponentFeature = {
	id: 'navbar',
	loginRequired: true,
	matches: [`${paths.base}/*`],
	runAt: 'document_end',
	async main(ctx: ContentScriptContext) {
		const navbar =
			document.querySelector<HTMLElement>('.oj-hn-nav-table') ??
			document.querySelector<HTMLElement>('#hnmain > tbody > tr');

		await darkModeToggle(ctx, document, navbar);
		moreLinksDropdown(ctx, document, navbar);
	},
};
