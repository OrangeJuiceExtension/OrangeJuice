import type { ContentScriptContext } from '#imports';
import { darkModeToggle } from '@/components/navbar/dark-mode-toggle.ts';
import { moreLinksDropdown } from '@/components/navbar/more-links-dropdown.ts';
import { paths } from '@/utils/paths.ts';
import type { ComponentFeature } from '@/utils/types.ts';

const getNavbarElement = (doc: Document): HTMLElement | null => {
	const extensionNavbar = doc.querySelector<HTMLElement>('.oj-hn-nav-table');
	if (extensionNavbar) {
		return extensionNavbar;
	}

	const firstPageTop = doc.querySelector<HTMLElement>('span.pagetop');
	const navbarRow = firstPageTop?.closest('tr');
	return navbarRow instanceof HTMLElement ? navbarRow : null;
};

export const navbar: ComponentFeature = {
	id: 'navbar',
	loginRequired: true,
	async main(ctx: ContentScriptContext) {
		const navbarElement = getNavbarElement(document);

		await darkModeToggle(ctx, document, navbarElement);
		moreLinksDropdown(ctx, document, navbarElement);
	},
	matches: [`${paths.base}/*`],
	runAt: 'document_end',
};
