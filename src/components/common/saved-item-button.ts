import { dom } from '@/utils/dom.ts';
import {
	getAuthToken,
	toggleItemState,
	updateButtonAndStorage,
} from '@/utils/saved-item-actions.ts';
import type { OJContext, SavedItemType } from '@/utils/types.ts';

const unvPrefixPattern = /^unv_/;
const itemIdPattern = /[?&]id=(\d+)/;

export const idExtractors = new Map<
	string,
	(nav: Element) => { element: Element | null; id: string | undefined }
>([
	[
		'default',
		(nav) => {
			const element = nav.querySelector('[id^="unv_"]');
			return { element, id: element?.id.replace(unvPrefixPattern, '') };
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

interface SavedItemButtonConfig {
	itemType: SavedItemType;
	actionName: 'fave' | 'flag';
	buttonClass: string;
	buttonLabels: { active: string; inactive: string };
	getStoredData: (ctx: OJContext) => StoredData | undefined;
}

export const initSavedItemsWithSelector = (
	doc: Document,
	ojCtx: OJContext,
	selector: string,
	cleanupHandlers: (() => void)[],
	config: SavedItemButtonConfig
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

		const storedData = config.getStoredData(ojCtx);
		let savedData = storedData?.items.get(commentId);
		const button = doc.createElement('button');
		button.textContent = savedData ? config.buttonLabels.active : config.buttonLabels.inactive;
		button.classList.add('oj_link_button', config.buttonClass);

		const handleClick = async (e: Event) => {
			e.stopPropagation();
			e.preventDefault();
			button.disabled = true;

			try {
				const authToken = await getAuthToken(commentId, config.actionName, storedData);
				if (!authToken) {
					return;
				}

				const isActive = savedData !== undefined;
				const success = await toggleItemState(
					commentId,
					isActive,
					authToken,
					config.actionName
				);

				if (success) {
					const result = await updateButtonAndStorage(
						button,
						commentId,
						isActive,
						authToken,
						{
							itemType: config.itemType,
							actionName: config.actionName,
							buttonLabels: config.buttonLabels,
						}
					);
					savedData = result ? result : undefined;
				}
			} catch (error) {
				console.error(`Failed to ${config.actionName}:`, error);
			} finally {
				button.disabled = false;
			}
		};

		button.addEventListener('click', handleClick);

		cleanupHandlers.push(() => {
			button.removeEventListener('click', handleClick);
		});

		const separator = document.createElement('span');
		separator.textContent = ' | ';

		idElement?.parentElement?.insertBefore(button, idElement.nextSibling);
		idElement?.parentElement?.insertBefore(separator, idElement.nextSibling);
	}
};

export const initSavedItems = (
	doc: Document,
	ojCtx: OJContext,
	allowedPaths: Map<string, string>,
	config: SavedItemButtonConfig
) => {
	const cleanupHandlers: (() => void)[] = [];

	dom.injectLinkButtonStyle(doc);

	const selector = allowedPaths.get(window.location.pathname);
	if (selector) {
		initSavedItemsWithSelector(doc, ojCtx, selector, cleanupHandlers, config);
	}

	return () => {
		for (const cleanup of cleanupHandlers) {
			cleanup();
		}
	};
};
