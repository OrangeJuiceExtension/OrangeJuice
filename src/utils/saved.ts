import { SavedItemType, SavedItemTypes } from '@/utils/types.ts';
import { dom } from './dom';
import { paths } from './paths';

const STORAGE_KEY_SAVED = 'oj_saved';
const STORAGE_KEY_LAST_SYNC = 'oj_saved_last_sync';
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

/**
 * Fetches all favorites for a user with pagination support
 */
const fetchAllByType = async (
	username: string,
	type: SavedItemType,
	cache: RequestCache | undefined = 'force-cache'
): Promise<Map<string, SavedItem>> => {
	const items = new Map<string, SavedItem>();
	const MAX_WORKERS = 5;
	const queue: number[] = [];
	let activeWorkers = 0;
	let resolve: (() => void) | null = null;

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
			queue.push(page + 1);
			processQueue();
		}
	};

	const processQueue = (): void => {
		while (activeWorkers < MAX_WORKERS && queue.length > 0) {
			const page = queue.shift();
			if (page === undefined) {
				break;
			}

			activeWorkers++;
			processPage(page).finally(() => {
				activeWorkers--;
				if (activeWorkers === 0 && queue.length === 0 && resolve) {
					resolve();
				} else {
					processQueue();
				}
			});
		}
	};

	await processPage(1);

	if (queue.length > 0 || activeWorkers > 0) {
		await new Promise<void>((res) => {
			resolve = res;
			processQueue();
		});
	}

	return items;
};

/**
 * Loads saved from local storage
 */
const loadSavedFromStorage = (): Map<string, SavedItem> => {
	const stored = localStorage.getItem(STORAGE_KEY_SAVED);
	if (!stored) {
		return new Map();
	}

	try {
		const items: SavedItem[] = JSON.parse(stored);
		return new Map(items.map((item) => [item.id, item]));
	} catch {
		return new Map();
	}
};

/**
 * Saves saved to local storage
 */
const saveToStorage = (data: Map<string, SavedItem>): void => {
	const items = Array.from(data.values());
	localStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify(items));
};

/**
 * Re-syncs storage with latest from website
 */
const syncSaved = async (username: string): Promise<Map<string, SavedItem>> => {
	const lastSync = localStorage.getItem(STORAGE_KEY_LAST_SYNC);
	const now = Date.now();
	let reload = false;

	if (lastSync) {
		const lastSyncTime = Number.parseInt(lastSync, 10);
		reload = now - lastSyncTime < SYNC_INTERVAL_MS;
		if (reload) {
			return loadSavedFromStorage();
		}
	}

	const localItems = loadSavedFromStorage();

	const fetchedItems = await SavedItemTypes.reduce(async (accPromise, type) => {
		const acc = await accPromise;
		const items = await fetchAllByType(username, type, reload ? 'default' : 'force-cache');
		return new Map([...acc, ...items]);
	}, Promise.resolve(new Map<string, SavedItem>()));

	// Merge: fetched items override local
	const savedItems = new Map([...localItems, ...fetchedItems]);

	saveToStorage(savedItems);
	localStorage.setItem(STORAGE_KEY_LAST_SYNC, now.toString());
	return savedItems;
};

/**
 * Adds a saved item to storage
 */
const addToStorage = (itemId: string, auth: string, type: SavedItemType): SavedItem | undefined => {
	const savedItems = loadSavedFromStorage();

	if (!savedItems.has(itemId)) {
		const newItem: SavedItem = { id: itemId, auth, type };
		savedItems.set(itemId, newItem);
		saveToStorage(savedItems);
		return newItem;
	}
};

/**
 * Removes a saved item from storage
 */
const removeFromStorage = (itemId: string): void => {
	const saved = loadSavedFromStorage();
	saved.delete(itemId);
	saveToStorage(saved);
};

/**
 * Gets auth token for a specific item
 */
const getAuthForItem = (itemId: string): string | undefined => {
	const saved = loadSavedFromStorage();
	return saved.get(itemId)?.auth;
};

/**
 * Updates a single saved item in storage
 */
const updateItem = (itemId: string, updates: Partial<Omit<SavedItem, 'id'>>): void => {
	const saved = loadSavedFromStorage();
	const item = saved.get(itemId);
	if (item) {
		saved.set(itemId, { ...item, ...updates });
		saveToStorage(saved);
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
