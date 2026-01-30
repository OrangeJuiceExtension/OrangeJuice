import { initSavedItems } from '@/components/common/saved-item-button.ts';
import { dom } from '@/utils/dom.ts';
import { paths } from '@/utils/paths.ts';
import { saved } from '@/utils/saved.ts';
import { type ComponentFeature, SavedItemType } from '@/utils/types.ts';

const allowedPaths = new Map<string, string>([
	['/item', '.comhead'],
	['/threads', '.comhead'],
]);

export const flag: ComponentFeature = {
	id: 'flag',
	loginRequired: true,
	matches: [`${paths.base}/*`],
	runAt: 'document_end',
	async main(ctx) {
		if (!allowedPaths.has(window.location.pathname)) {
			return;
		}

		const username = dom.getUsername(document);
		if (!username) {
			return;
		}

		const flags = await saved.syncSaved(username);
		const cleanup = initSavedItems(
			document,
			{
				user: {
					username,
				},
				flags,
			},
			allowedPaths,
			{
				itemType: SavedItemType.FlagsComments,
				actionName: 'flag',
				buttonClass: 'oj_flag_link',
				buttonLabels: { active: 'un-flag', inactive: 'flag' },
				getStoredData: (ctx) => ctx.flags,
			}
		);

		ctx.onInvalidated(() => {
			cleanup();
		});
	},
};
