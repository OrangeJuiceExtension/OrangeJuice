import type { HNItemInfo, HNUser } from '@/utils/api.ts';
import lStorage from '@/utils/local-storage.ts';

const FOLLOWING_CACHE_STORAGE_KEY = 'oj_following_cache';
const FOLLOWING_CACHE_TTL_MS = 5 * 60 * 1000;

type CachedFollowingItemStorage = Omit<HNItemInfo, 'by'> & {
	storyTitle?: string;
};

export type CachedFollowingItem = CachedFollowingItemStorage;
type FollowingCacheInputItem = HNItemInfo & {
	storyTitle?: string;
};

export interface CachedFollowingSection {
	items: CachedFollowingItem[];
	user?: HNUser;
	username: string;
}

interface FollowingCacheInputSection {
	items: FollowingCacheInputItem[];
	user?: HNUser;
	username: string;
}

type StoredFollowingUser = Omit<HNUser, 'id'>;

interface StoredFollowingSection {
	expiresAt: number;
	items: CachedFollowingItemStorage[];
	user?: StoredFollowingUser;
}

type FollowingCacheStore = Record<string, StoredFollowingSection>;

const getStoredCache = async (): Promise<FollowingCacheStore> =>
	(await lStorage.getItem<FollowingCacheStore>(FOLLOWING_CACHE_STORAGE_KEY)) ?? {};

const setStoredCache = async (cache: FollowingCacheStore): Promise<void> => {
	await lStorage.setItem(FOLLOWING_CACHE_STORAGE_KEY, cache);
};

export const getCachedFollowingSection = async (
	username: string
): Promise<CachedFollowingSection | undefined> => {
	const cache = await getStoredCache();
	const entry = cache[username];
	if (!entry) {
		return undefined;
	}

	if (entry.expiresAt <= Date.now()) {
		delete cache[username];
		await setStoredCache(cache);
		return undefined;
	}

	const { expiresAt: _expiresAt, user, ...section } = entry;
	return {
		...section,
		user: user ? { ...user, id: username } : undefined,
		username,
	};
};

export const setCachedFollowingSection = async (
	section: FollowingCacheInputSection
): Promise<void> => {
	const cache = await getStoredCache();
	const { username, user, items } = section;
	const storedUser = user ? (({ id: _id, ...rest }) => rest)(user) : undefined;
	cache[username] = {
		items: items.map(({ by: _by, ...item }) => item),
		user: storedUser,
		expiresAt: Date.now() + FOLLOWING_CACHE_TTL_MS,
	};
	await setStoredCache(cache);
};
