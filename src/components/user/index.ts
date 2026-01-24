import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import { showUserInfoOnHover } from '@/components/user/show-user-info-hover.ts';
import { paths } from '@/utils/paths.ts';
import type { ComponentFeature } from '@/utils/types.ts';

export const user: ComponentFeature = {
	id: 'user',
	loginRequired: true,
	matches: [`${paths.base}/*`],
	exclude: [`${paths.base}/user`],
	runAt: 'document_end',
	main(ctx: ContentScriptContext) {
		const allUsers = document.querySelectorAll('a.hnuser') as NodeListOf<HTMLAnchorElement>;
		if (!allUsers.length) {
			return;
		}

		return Promise.all([
			Promise.resolve().then(() => showUserInfoOnHover(document, ctx, allUsers)),
		]);
	},
};
