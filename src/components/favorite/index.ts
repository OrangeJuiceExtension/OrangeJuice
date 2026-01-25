import { dom } from '@/utils/dom.ts';
import { paths } from '@/utils/paths.ts';
import { saved } from '@/utils/saved.ts';
import {
	type ComponentFeature,
	type OJContext,
	type SavedItem,
	SavedItemType,
} from '@/utils/types.ts';

const authMatchPattern = /auth=([^&]+)/;
const unvePrefixPattern = /^unv_/;
const itemIdPattern = /[?&]id=(\d+)/;

const idExtractors = new Map<
	string,
	(nav: Element) => { element: Element | null; id: string | undefined }
>([
	[
		'default',
		(nav) => {
			const element = nav.querySelector('[id^="unv_"]');
			return { element, id: element?.id.replace(unvePrefixPattern, '') };
		},
	],
	[
		'/jobs',
		(nav) => {
			const element = nav.querySelector<HTMLAnchorElement>('a[href*="item?id="]');
			return { element, id: element?.href.match(itemIdPattern)?.[1] };
		},
	],
]);

const getAuthToken = async (
	commentId: string,
	favorites?: StoredData
): Promise<string | undefined> => {
	const savedItem = favorites?.items.get(commentId);
	if (savedItem?.auth) {
		return savedItem.auth;
	}

	const itemPageUrl = `${paths.base}/item?id=${commentId}`;
	const itemDiv = await dom.getPageDom(itemPageUrl);
	if (!itemDiv) {
		throw new Error('Failed to fetch comment page');
	}

	const faveLink = itemDiv.querySelector<HTMLAnchorElement>('a[href*="fave?id="]');
	const authToken = faveLink?.href.match(authMatchPattern)?.[1];

	if (authToken && savedItem) {
		saved.updateItem(commentId, { auth: authToken });
	}

	return authToken;
};

const toggleFavoriteState = async (
	commentId: string,
	isFavorited: boolean,
	authToken: string
): Promise<boolean> => {
	const url = isFavorited
		? `${paths.base}/fave?id=${commentId}&un=t&auth=${authToken}`
		: `${paths.base}/fave?id=${commentId}&auth=${authToken}`;

	const response = await fetch(url, {
		method: 'GET',
		credentials: 'include',
		redirect: 'manual',
	});

	if (!response.ok && response.status !== 302 && response.status !== 0) {
		throw new Error(
			`Failed to toggle favorite state for comment ${commentId}: ${response.status} ${response.statusText}`
		);
	}

	return true;
};

const updateButtonAndStorage = (
	button: HTMLButtonElement,
	commentId: string,
	isFavorited: boolean,
	authToken: string
): SavedItem | undefined => {
	button.textContent = isFavorited ? 'favorite' : 'un-favorite';

	if (isFavorited) {
		// console.log(`removedFromStorage: ${commentId} ${button.textContent}`);
		saved.removeFromStorage(commentId);
		return undefined;
	}

	// console.log(`addToStorage: ${commentId} ${button.textContent}`);
	return saved.addToStorage(commentId, authToken, SavedItemType.FavoriteComments);
};

const initFavoritesWithSelector = (
	doc: Document,
	ojCtx: OJContext,
	selector: string,
	cleanupHandlers: (() => void)[]
) => {
	const navs = [...doc.querySelectorAll(selector)];
	const pathname = window.location.pathname;
	const extractId = idExtractors.get(pathname) || idExtractors.get('default');
	if (!extractId) {
		return;
	}

	for (const nav of navs) {
		const { element: idElement, id: commentId } = extractId(nav);
		if (!commentId) {
			continue;
		}

		let savedData = ojCtx.favorites?.items.get(commentId);
		const favoriteButton = doc.createElement('button');
		favoriteButton.textContent = savedData ? 'un-favorite' : 'favorite';
		favoriteButton.className = 'oj-link-button';

		const handleFavoriteClick = async (e: Event) => {
			e.stopPropagation();
			e.preventDefault();
			favoriteButton.disabled = true;

			try {
				const authToken = await getAuthToken(commentId, ojCtx.favorites);
				if (!authToken) {
					return;
				}

				const isFavorited = savedData !== undefined;
				const success = await toggleFavoriteState(commentId, isFavorited, authToken);

				if (success) {
					savedData = updateButtonAndStorage(
						favoriteButton,
						commentId,
						isFavorited,
						authToken
					);
				}
			} catch (error) {
				console.error('Failed to favorite/un-favorite:', error);
			} finally {
				favoriteButton.disabled = false;
			}
		};

		favoriteButton.addEventListener('click', handleFavoriteClick);

		cleanupHandlers.push(() => {
			favoriteButton.removeEventListener('click', handleFavoriteClick);
		});

		const separator = document.createElement('span');
		separator.textContent = ' | ';

		idElement?.parentElement?.insertBefore(favoriteButton, idElement.nextSibling);
		idElement?.parentElement?.insertBefore(separator, idElement.nextSibling);
	}
};

export const initFavorites = (doc: Document, ojCtx: OJContext) => {
	const cleanupHandlers: (() => void)[] = [];

	dom.injectLinkButtonStyle(doc);

	const selector = allowedPaths.get(window.location.pathname);
	if (selector) {
		initFavoritesWithSelector(doc, ojCtx, selector, cleanupHandlers);
	}

	return () => {
		for (const cleanup of cleanupHandlers) {
			cleanup();
		}
	};
};

const allowedPaths = new Map<string, string>([
	['/', '.subline'],
	['/news', '.subline'],
	['/newest', '.subline'],
	['/front', '.subline'],
	['/item', '.comhead'],
	['/show', '.subline'],
	['/jobs', '.subtext'],
	['/ask', '.subline'],
	['/active', '.subline'],
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
		const cleanup = initFavorites(document, {
			user: {
				username,
			},
			favorites: favs,
		});

		ctx.onInvalidated(() => {
			cleanup();
		});
	},
};
