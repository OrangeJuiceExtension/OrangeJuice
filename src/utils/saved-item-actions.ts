import { dom } from '@/utils/dom.ts';
import { paths } from '@/utils/paths.ts';
import { saved } from '@/utils/saved.ts';
import type { SavedItemType } from '@/utils/types.ts';

const authMatchPattern = /auth=([^&]+)/;

interface ActionConfig {
	itemType: SavedItemType;
	actionName: 'fave' | 'flag';
	buttonLabels: { active: string; inactive: string };
}

export const getAuthToken = async (
	commentId: string,
	actionName: 'fave' | 'flag',
	storedData?: StoredData
): Promise<string | undefined> => {
	const savedItem = storedData?.items.get(commentId);
	if (savedItem?.auth) {
		return savedItem.auth;
	}

	const itemPageUrl = `${paths.base}/item?id=${commentId}`;
	const itemDiv = await dom.getPageDom(itemPageUrl);
	if (!itemDiv) {
		throw new Error('Failed to fetch comment page');
	}

	const actionLink = itemDiv.querySelector<HTMLAnchorElement>(`a[href*="${actionName}?id="]`);
	const authToken = actionLink?.href.match(authMatchPattern)?.[1];

	if (authToken && savedItem) {
		await saved.updateItem(commentId, { auth: authToken });
	}

	return authToken;
};

export const toggleItemState = async (
	commentId: string,
	isActive: boolean,
	authToken: string,
	actionName: 'fave' | 'flag'
): Promise<boolean> => {
	const url = isActive
		? `${paths.base}/${actionName}?id=${commentId}&un=t&auth=${authToken}`
		: `${paths.base}/${actionName}?id=${commentId}&auth=${authToken}`;

	const response = await fetch(url, {
		method: 'GET',
		credentials: 'include',
		redirect: 'manual',
	});

	if (!response.ok && response.status !== 302 && response.status !== 0) {
		throw new Error(
			`Failed to toggle ${actionName} state for comment ${commentId}: ${response.status} ${response.statusText}`
		);
	}

	return true;
};

export const updateButtonAndStorage = async (
	button: HTMLButtonElement,
	commentId: string,
	isActive: boolean,
	authToken: string,
	config: ActionConfig
) => {
	button.textContent = isActive ? config.buttonLabels.inactive : config.buttonLabels.active;

	if (isActive) {
		return await saved.removeFromStorage(commentId);
	}

	return saved.addToStorage(commentId, authToken, config.itemType);
};
