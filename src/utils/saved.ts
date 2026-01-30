import lStorage from '@/utils/localStorage.ts';
import { SavedItemType, SavedItemTypes } from '@/utils/types.ts';
import { dom } from './dom';
import { paths } from './paths';

const STORAGE_KEY_SAVED = 'oj_saved_items';
const SYNC_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const idMatchPattern = /id=(\d+)/;
const authMatchPattern = /auth=([^&]+)/;

const actionFromType = (type: SavedItemType): string | undefined => {
	switch (type) {
		case SavedItemType.Hidden:
			return 'hide?id=';
		case SavedItemType.FlagsSubmissions:
		case SavedItemType.FlagsComments:
			return 'flag?id=';
		// case SavedItemType.VotesComments:
		// 	return '/vote?id=';
		case SavedItemType.FavoriteSubmissions:
		case SavedItemType.FavoriteComments:
			return 'fave?id=';
		default:
			return undefined;
	}
};

const urlFromType = (username: string, type: SavedItemType, page = 1): string | undefined => {
	const pageParam = page > 1 ? `&p=${page}` : '';

	switch (type) {
		case SavedItemType.Submissions:
			return `${paths.base}/submitted?id=${username}${pageParam}`;
		case SavedItemType.Comments:
			return `${paths.base}/threads?id=${username}${pageParam}`;
		case SavedItemType.Hidden:
			return `${paths.base}/hidden?id=${username}${pageParam}`;
		case SavedItemType.FlagsSubmissions:
			return `${paths.base}/flagged?id=${username}${pageParam}`;
		case SavedItemType.FlagsComments:
			return `${paths.base}/flagged?id=${username}&kind=comments${pageParam}`;
		case SavedItemType.VotesSubmissions:
			return `${paths.base}/upvoted?id=${username}${pageParam}`;
		case SavedItemType.VotesComments:
			return `${paths.base}/upvoted?id=${username}&comments=t${pageParam}`;
		case SavedItemType.FavoriteSubmissions:
			return `${paths.base}/favorites?id=${username}${pageParam}`;
		case SavedItemType.FavoriteComments:
			return `${paths.base}/favorites?id=${username}&comments=t${pageParam}`;
		default:
			return undefined;
	}
};

const extractItemsWithAuth = (
	doc: HTMLElement,
	actionLink: string,
	type: SavedItemType
): SavedItem[] => {
	const items: SavedItem[] = [];
	const links = doc.querySelectorAll<HTMLAnchorElement>(`a[href*="${actionLink}"]`);

	for (const link of links) {
		const href = link.getAttribute('href') || '';
		const idMatch = href.match(idMatchPattern);
		const authMatch = href.match(authMatchPattern);

		if (idMatch && authMatch) {
			items.push({
				id: idMatch[1],
				auth: authMatch[1],
				type,
			});
		}
	}

	return items;
};

const extractItemsWithoutAuth = (doc: HTMLElement, type: SavedItemType): SavedItem[] => {
	const items: SavedItem[] = [];
	const links = doc.querySelectorAll<HTMLAnchorElement>('.age');

	for (const link of links) {
		const href = link.getAttribute('href') || '';
		const idMatch = href.match(idMatchPattern);

		if (idMatch) {
			items.push({
				id: idMatch[1],
				type,
			});
		}
	}

	return items;
};

const extractItemsFromPage = (doc: HTMLElement, type: SavedItemType): SavedItem[] => {
	const actionLink = actionFromType(type);
	if (actionLink) {
		return extractItemsWithAuth(doc, actionLink, type);
	}
	return extractItemsWithoutAuth(doc, type);
};

const hasMorePages = (doc: HTMLElement): boolean => {
	return !!doc.querySelector<HTMLAnchorElement>('a.morelink[href*="p="]');
};

const processConcurrent = <T, R>(
	items: T[],
	maxConcurrency: number,
	processor: (item: T) => Promise<R>
): Promise<R[]> => {
	const results: R[] = [];
	const queue = [...items];
	let activeWorkers = 0;

	return new Promise((resolve) => {
		const processNext = (): void => {
			while (activeWorkers < maxConcurrency && queue.length > 0) {
				const item = queue.shift();
				if (item === undefined) {
					break;
				}

				activeWorkers++;
				processor(item)
					.then((result) => {
						results.push(result);
					})
					.finally(() => {
						activeWorkers--;
						if (activeWorkers === 0 && queue.length === 0) {
							resolve(results);
						} else {
							processNext();
						}
					});
			}
		};

		processNext();
	});
};

/**
 * Fetches all favorites for a user with pagination support
 */
const fetchAllByType = async (
	username: string,
	type: SavedItemType,
	cache: RequestCache | undefined = 'force-cache'
): Promise<Map<string, SavedItem>> => {
	const items = new Map<string, SavedItem>();
	const pagesToProcess: number[] = [1];

	const processPage = async (page: number): Promise<void> => {
		const url = urlFromType(username, type, page);
		if (!url) {
			return;
		}

		const doc = await dom.getPageDom(url, cache);
		if (!doc) {
			return;
		}

		for (const item of extractItemsFromPage(doc, type)) {
			items.set(item.id, item);
		}

		if (hasMorePages(doc)) {
			pagesToProcess.push(page + 1);
		}
	};

	while (pagesToProcess.length > 0) {
		const currentBatch = pagesToProcess.splice(0, pagesToProcess.length);
		// don't be too concurrent, we don't want to piss them off
		await processConcurrent(currentBatch, 2, processPage);
	}

	return items;
};

export interface StoredData {
	items: Map<string, SavedItem>;
	lastSync: number;
}

interface StoredDataSaved {
	items: Record<string, SavedItem>;
	lastSync: number;
}

/**
 * Loads saved from local storage
 */
const loadSavedFromStorage = async (): Promise<StoredData> => {
	const fallback = {
		items: new Map<string, SavedItem>(),
		lastSync: 0,
	} as StoredData;

	const stored = await lStorage.getItem<StoredDataSaved>(STORAGE_KEY_SAVED);
	if (!stored) {
		return fallback;
	}
	return {
		items: new Map(Object.entries(stored.items || {})),
		lastSync: stored.lastSync || 0,
	} as StoredData;
};

/**
 * Saves saved to local storage
 */
const saveToStorage = async (data: StoredData): Promise<void> => {
	const serializable = {
		items: Object.fromEntries(data.items),
		lastSync: data.lastSync,
	} as StoredDataSaved;
	await lStorage.setItem<StoredDataSaved>(STORAGE_KEY_SAVED, serializable);
};

/**
 * Re-syncs storage with the latest from website
 */
const syncSaved = async (username: string): Promise<StoredData> => {
	const storedData = await loadSavedFromStorage();

	const now = Date.now();
	const reload = now - storedData.lastSync < SYNC_INTERVAL_MS;
	if (reload) {
		return loadSavedFromStorage();
	}

	// Merge: fetched items override local. kind of hard to read, but most efficient
	// don't be too concurrent, we don't want to piss them off
	const savedItems = {
		items: await processConcurrent(SavedItemTypes, 2, (type) =>
			fetchAllByType(username, type, 'force-cache')
		).then((maps) =>
			maps.reduce((acc, m) => {
				for (const [k, v] of m) {
					acc.set(k, v);
				}
				return acc;
			}, new Map(storedData.items))
		),
		lastSync: now,
	};

	await saveToStorage(savedItems);
	return savedItems;
};

/**
 * Adds a saved item to storage
 */
const addToStorage = async (
	itemId: string,
	auth: string,
	type: SavedItemType
): Promise<SavedItem | undefined> => {
	const storedData = await loadSavedFromStorage();

	if (!storedData.items.has(itemId)) {
		const newItem: SavedItem = { id: itemId, auth, type };
		storedData.items.set(itemId, newItem);
		await saveToStorage(storedData);
		return newItem;
	}
};

/**
 * Removes a saved item from storage
 */
const removeFromStorage = async (itemId: string): Promise<void> => {
	const saved = await loadSavedFromStorage();
	saved.items.delete(itemId);
	return saveToStorage(saved);
};

/**
 * Gets auth token for a specific item
 */
const getAuthForItem = async (itemId: string): Promise<string | undefined> => {
	const saved = await loadSavedFromStorage();
	return saved.items.get(itemId)?.auth;
};

/**
 * Updates a single saved item in storage
 */
const updateItem = async (
	itemId: string,
	updates: Partial<Omit<SavedItem, 'id'>>
): Promise<void> => {
	const saved = await loadSavedFromStorage();
	const item = saved.items.get(itemId);
	if (item) {
		saved.items.set(itemId, { ...item, ...updates });
		await saveToStorage(saved);
	}
};

export const saved = {
	fetchAllByType,
	loadSavedFromStorage,
	saveToStorage,
	syncSaved,
	addToStorage,
	removeFromStorage,
	getAuthForItem,
	updateItem,
};
