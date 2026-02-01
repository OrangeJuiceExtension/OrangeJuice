import type { ContentScriptContext } from '#imports';
import { profileLinksDropdown } from '@/components/user/profile-links-dropdown.ts';
import { showUserInfoOnHover } from '@/components/user/show-user-info-hover.ts';
import { topLeadersKarma } from '@/components/user/top-leaders-karma.ts';
import { userAboutLinkify } from '@/components/user/user-about-linkify.ts';
import { paths } from '@/utils/paths.ts';
import type { ComponentFeature } from '@/utils/types.ts';

export const user: ComponentFeature = {
	id: 'user',
	loginRequired: true,
	matches: [`${paths.base}/*`],
	runAt: 'document_end',
	main(ctx: ContentScriptContext) {
		return Promise.all([
			Promise.resolve().then(() => showUserInfoOnHover(document, ctx)),
			Promise.resolve().then(() => profileLinksDropdown(document, ctx)),
			Promise.resolve().then(() => userAboutLinkify(document, ctx)),
			Promise.resolve().then(() => topLeadersKarma(document, ctx)),
		]);
	},
};
