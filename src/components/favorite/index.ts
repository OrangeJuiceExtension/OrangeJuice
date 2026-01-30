import { initSavedItems } from '@/components/common/saved-item-button.ts';
import { dom } from '@/utils/dom.ts';
import { paths } from '@/utils/paths.ts';
import { saved } from '@/utils/saved.ts';
import { type ComponentFeature, SavedItemType } from '@/utils/types.ts';

// TODO: should we just query for the selectors and forget the hard coded stuff here?
export const allowedPaths = new Map<string, string>([
	['/', '.subline'],
	['/news', '.subline'],
	['/newest', '.subline'],
	['/front', '.subline'],
	['/item', '.comhead'],
	['/show', '.subline'],
	['/shownew', '.subline'],
	['/classic', '.subline'],
	['/launches', '.subline'],
	['/jobs', '.subtext'],
	['/ask', '.subline'],
	['/active', '.subline'],
	['/best', '.subline'],
	['/bestcomments', '.comhead'],
	['/newcomments', '.comhead'],
	['/noobcomments', '.comhead'],
	['/noobstories', '.subline'],
	['/pool', '.subline'],
	['/threads', '.comhead'],
]);

export const favorite: ComponentFeature = {
	id: 'favorite',
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

		const favs = await saved.syncSaved(username);
		const cleanup = initSavedItems(
			document,
			{
				user: {
					username,
				},
				favorites: favs,
			},
			allowedPaths,
			{
				itemType: SavedItemType.FavoriteComments,
				actionName: 'fave',
				buttonClass: 'oj_favorite_link',
				buttonLabels: { active: 'un-favorite', inactive: 'favorite' },
				getStoredData: (ctx) => ctx.favorites,
			}
		);

		ctx.onInvalidated(() => {
			cleanup();
		});
	},
};
