import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import { profileLinksDropdown } from '@/components/user/profile-links-dropdown.ts';
import { showUserInfoOnHover } from '@/components/user/show-user-info-hover.ts';
import { userAboutLinkify } from '@/components/user/user-about-linkify.ts';
import { paths } from '@/utils/paths.ts';
import type { ComponentFeature } from '@/utils/types.ts';

export const user: ComponentFeature = {
	id: 'user',
	loginRequired: true,
	matches: [`${paths.base}/*`],
	runAt: 'document_end',
	main(ctx: ContentScriptContext) {
		const allUsers = document.querySelectorAll('a.hnuser') as NodeListOf<HTMLAnchorElement>;
		if (!allUsers.length) {
			return;
		}

		return Promise.all([
			Promise.resolve().then(() => showUserInfoOnHover(document, ctx, allUsers)),
			Promise.resolve().then(() => profileLinksDropdown(document, ctx)),
			Promise.resolve().then(() => userAboutLinkify(document, ctx)),
		]);
	},
};
