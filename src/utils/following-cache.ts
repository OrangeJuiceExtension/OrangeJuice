import type { HNItemInfo, HNUser } from '@/utils/api.ts';
import lStorage from '@/utils/local-storage.ts';

const FOLLOWING_CACHE_STORAGE_KEY = 'oj_following_cache';
const FOLLOWING_CACHE_TTL_MS = 60 * 60 * 1000;
const UI_STATE_KEY = '__ui';
const sectionKey = (username: string): string =>
	`${FOLLOWING_CACHE_STORAGE_KEY}:section:${username}`;
const expandedKey = (username: string): string =>
	`${FOLLOWING_CACHE_STORAGE_KEY}:expanded:${username}`;

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

let legacyCachePromise: Promise<FollowingCacheStore> | undefined;
const getLegacyCache = (): Promise<FollowingCacheStore> => {
	legacyCachePromise ??= loadLegacyCache();
	return legacyCachePromise;
};
const loadLegacyCache = async (): Promise<FollowingCacheStore> => {
	try {
		return normalizeStoredCache(await lStorage.getItem<unknown>(FOLLOWING_CACHE_STORAGE_KEY));
	} catch (error) {
		legacyCachePromise = undefined;
		throw error;
	}
};

// Separate keys prevent concurrent users and UI updates from overwriting each other.
// Keep an empty wrapper when clearing a section so legacy data cannot reappear.
interface StoredSectionEntry {
	section?: StoredFollowingSection;
}

const getStoredSection = async (username: string): Promise<StoredFollowingSection | undefined> => {
	const entry = await lStorage.getItem<StoredSectionEntry>(sectionKey(username));
	if (entry !== null) {
		return entry.section;
	}
	const legacy = await getLegacyCache();
	return legacy.sections[username];
};

export const getCachedFollowingSection = async (
	username: string
): Promise<CachedFollowingSection | undefined> => {
	const entry = await getStoredSection(username);
	if (!entry || entry.expiresAt <= Date.now()) {
		return;
	}
	const { expiresAt: _expiresAt, user, ...section } = entry;
	return { ...section, user: user ? { ...user, id: username } : undefined, username };
};

export const setCachedFollowingSection = async (
	section: FollowingCacheInputSection
): Promise<void> => {
	const { username, user, items } = section;
	const storedUser = user ? (({ id: _id, ...rest }) => rest)(user) : undefined;
	await lStorage.setItem<StoredSectionEntry>(sectionKey(username), {
		section: {
			expiresAt: Date.now() + FOLLOWING_CACHE_TTL_MS,
			items: items.map(({ by: _by, ...item }) => item),
			user: storedUser,
		},
	});
};

export const clearCachedFollowingSection = async (username: string): Promise<void> => {
	await lStorage.setItem<StoredSectionEntry>(sectionKey(username), {});
};

export const isFollowingSectionExpanded = async (username: string): Promise<boolean> => {
	const expanded = await lStorage.getItem<boolean>(expandedKey(username));
	if (expanded !== null) {
		return expanded;
	}
	const legacy = await getLegacyCache();
	return legacy[UI_STATE_KEY]?.expandedByUsername?.[username] ?? false;
};

export const setFollowingSectionExpanded = async (
	username: string,
	isExpanded: boolean
): Promise<void> => {
	await lStorage.setItem(expandedKey(username), isExpanded);
};
