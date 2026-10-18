import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let lStorage: typeof import('@/utils/local-storage.ts').default;

const STORAGE_KEY = 'oj_following_cache';
const SECTION_KEY = `${STORAGE_KEY}:section:alice`;
const EXPANDED_KEY = `${STORAGE_KEY}:expanded:alice`;
const USER = { created: 1, id: 'alice', karma: 42, submitted: [1] };
const ITEM = { by: 'alice', id: 1, time: 1, title: 'story', type: 'story' } as const;

let cache: typeof import('@/utils/following-cache.ts');

describe('following-cache', () => {
	beforeEach(async () => {
		vi.resetModules();
		lStorage = (await import('@/utils/local-storage.ts')).default;
		await lStorage.clear();
		cache = await import('@/utils/following-cache.ts');
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('stores a compact section and reads it before expiry', async () => {
		await cache.setCachedFollowingSection({ items: [ITEM], user: USER, username: 'alice' });
		await expect(cache.getCachedFollowingSection('alice')).resolves.toEqual({
			items: [{ id: 1, time: 1, title: 'story', type: 'story' }],
			user: USER,
			username: 'alice',
		});
		const stored = await lStorage.getItem<{
			section: { user: Record<string, unknown>; items: Record<string, unknown>[] };
		}>(SECTION_KEY);
		expect(stored?.section.user).not.toHaveProperty('id');
		expect(stored?.section.items[0]).not.toHaveProperty('by');
	});

	it('does not return expired sections', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(0);
		await cache.setCachedFollowingSection({ items: [ITEM], username: 'alice' });
		vi.setSystemTime(60 * 60 * 1000);
		await expect(cache.getCachedFollowingSection('alice')).resolves.toBeUndefined();
	});

	it('preserves concurrent saves and UI updates', async () => {
		await Promise.all([
			cache.setCachedFollowingSection({ items: [ITEM], username: 'alice' }),
			cache.setCachedFollowingSection({ items: [], username: 'bob' }),
			cache.setFollowingSectionExpanded('alice', true),
			cache.setFollowingSectionExpanded('bob', true),
		]);
		await Promise.all(
			['alice', 'bob'].map(async (username) => {
				await expect(cache.getCachedFollowingSection(username)).resolves.toMatchObject({
					username,
				});
				await expect(cache.isFollowingSectionExpanded(username)).resolves.toBe(true);
			})
		);
	});

	it('clears only the requested user without resetting expansion', async () => {
		await cache.setCachedFollowingSection({ items: [], username: 'alice' });
		await cache.setCachedFollowingSection({ items: [], username: 'bob' });
		await cache.setFollowingSectionExpanded('alice', true);
		await cache.clearCachedFollowingSection('alice');
		await expect(cache.getCachedFollowingSection('alice')).resolves.toBeUndefined();
		await expect(cache.getCachedFollowingSection('bob')).resolves.toMatchObject({
			username: 'bob',
		});
		await expect(cache.isFollowingSectionExpanded('alice')).resolves.toBe(true);
	});

	it.each([
		{ format: 'original', wrap: false },
		{ format: 'sections', wrap: true },
	])('reads the $format legacy format without resurrecting cleared data', async ({ wrap }) => {
		const sections = { alice: { expiresAt: Date.now() + 60_000, items: [ITEM] } };
		await lStorage.setItem(
			STORAGE_KEY,
			wrap ? { __ui: { expandedByUsername: { alice: true } }, sections } : sections
		);
		await expect(cache.getCachedFollowingSection('alice')).resolves.toMatchObject({
			items: [ITEM],
			username: 'alice',
		});
		await expect(cache.isFollowingSectionExpanded('alice')).resolves.toBe(wrap);
		await cache.clearCachedFollowingSection('alice');
		await expect(cache.getCachedFollowingSection('alice')).resolves.toBeUndefined();
	});

	it('reads only per-user keys for populated sections and expansion state', async () => {
		await cache.setCachedFollowingSection({ items: [], username: 'alice' });
		await cache.setFollowingSectionExpanded('alice', false);
		const getItem = vi.spyOn(lStorage, 'getItem');
		await cache.getCachedFollowingSection('alice');
		await expect(cache.isFollowingSectionExpanded('alice')).resolves.toBe(false);
		expect(getItem.mock.calls.map(([key]) => key)).toEqual([SECTION_KEY, EXPANDED_KEY]);
	});

	it('loads legacy storage only once for missing users and default UI state', async () => {
		const getItem = vi.spyOn(lStorage, 'getItem');
		await Promise.all(
			['alice', 'bob'].map((username) => cache.getCachedFollowingSection(username))
		);
		await Promise.all(
			['alice', 'bob'].map((username) => cache.isFollowingSectionExpanded(username))
		);
		expect(getItem.mock.calls.filter(([key]) => key === STORAGE_KEY)).toHaveLength(1);
	});
});
