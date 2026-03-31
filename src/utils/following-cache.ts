import type { HNItemInfo, HNUser } from '@/utils/api.ts';
import lStorage from '@/utils/local-storage.ts';

const FOLLOWING_CACHE_STORAGE_KEY = 'oj_following_cache';
const FOLLOWING_CACHE_TTL_MS = 60 * 60 * 1000;
const UI_STATE_KEY = '__ui';

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

interface FollowingCacheUiState {
	expandedByUsername?: Record<string, boolean>;
}

type LegacyFollowingCacheStore = Record<string, StoredFollowingSection>;

interface FollowingCacheStore {
	sections: Record<string, StoredFollowingSection>;
	[UI_STATE_KEY]?: FollowingCacheUiState;
}

const isStoredFollowingSection = (value: unknown): value is StoredFollowingSection => {
	if (!(value && typeof value === 'object')) {
		return false;
	}

	const candidate = value as Partial<StoredFollowingSection>;
	return typeof candidate.expiresAt === 'number' && Array.isArray(candidate.items);
};

const normalizeStoredCache = (stored: unknown): FollowingCacheStore => {
	if (!(stored && typeof stored === 'object')) {
		return { sections: {} };
	}

	if ('sections' in stored) {
		const cache = stored as Partial<FollowingCacheStore>;
		return {
			[UI_STATE_KEY]: cache[UI_STATE_KEY],
			sections: cache.sections ?? {},
		};
	}

	const legacyStore = stored as LegacyFollowingCacheStore;
	const sections = Object.fromEntries(
		Object.entries(legacyStore).filter(([, value]) => isStoredFollowingSection(value))
	);
	return { sections };
};

const getStoredCache = async (): Promise<FollowingCacheStore> =>
	normalizeStoredCache(await lStorage.getItem<unknown>(FOLLOWING_CACHE_STORAGE_KEY));

const setStoredCache = async (cache: FollowingCacheStore): Promise<void> => {
	await lStorage.setItem(FOLLOWING_CACHE_STORAGE_KEY, cache);
};

export const getCachedFollowingSection = async (
	username: string
): Promise<CachedFollowingSection | undefined> => {
	const cache = await getStoredCache();
	const entry = cache.sections[username];
	if (!entry) {
		return undefined;
	}

	if (entry.expiresAt <= Date.now()) {
		delete cache.sections[username];
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
	cache.sections[username] = {
		items: items.map(({ by: _by, ...item }) => item),
		user: storedUser,
		expiresAt: Date.now() + FOLLOWING_CACHE_TTL_MS,
	};
	await setStoredCache(cache);
};

export const clearCachedFollowingSection = async (username: string): Promise<void> => {
	const cache = await getStoredCache();
	if (!(username in cache.sections)) {
		return;
	}

	delete cache.sections[username];
	await setStoredCache(cache);
};

export const isFollowingSectionExpanded = async (username: string): Promise<boolean> => {
	const cache = await getStoredCache();
	return cache[UI_STATE_KEY]?.expandedByUsername?.[username] ?? false;
};

export const setFollowingSectionExpanded = async (
	username: string,
	isExpanded: boolean
): Promise<void> => {
	const cache = await getStoredCache();
	const expandedByUsername = {
		...(cache[UI_STATE_KEY]?.expandedByUsername ?? {}),
		[username]: isExpanded,
	};
	cache[UI_STATE_KEY] = {
		...(cache[UI_STATE_KEY] ?? {}),
		expandedByUsername,
	};
	await setStoredCache(cache);
};
