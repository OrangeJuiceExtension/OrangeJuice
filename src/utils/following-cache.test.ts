import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HNUser } from '@/utils/api.ts';
import { getCachedFollowingSection, setCachedFollowingSection } from '@/utils/following-cache.ts';
import lStorage from '@/utils/local-storage.ts';

const STORAGE_KEY = 'oj_following_cache';

describe('following-cache', () => {
	afterEach(async () => {
		vi.useRealTimers();
		await lStorage.setItem(STORAGE_KEY, null);
	});

	it('returns cached sections before they expire', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-03-30T12:00:00Z'));

		const user: HNUser = {
			created: 1,
			id: 'alice',
			karma: 42,
			submitted: [1],
		};

		await setCachedFollowingSection({
			items: [{ id: 1, time: 1, title: 'story', type: 'story' }],
			user,
			username: 'alice',
		});

		await expect(getCachedFollowingSection('alice')).resolves.toEqual({
			items: [{ id: 1, time: 1, title: 'story', type: 'story' }],
			user,
			username: 'alice',
		});
		await expect(
			lStorage.getItem<Record<string, { user?: Record<string, unknown>; username?: string }>>(
				STORAGE_KEY
			)
		).resolves.toMatchObject({
			alice: {
				user: {
					created: 1,
					karma: 42,
					submitted: [1],
				},
			},
		});
		await expect(
			lStorage.getItem<Record<string, { user?: { id?: string }; username?: string }>>(
				STORAGE_KEY
			)
		).resolves.not.toMatchObject({
			alice: {
				user: {
					id: 'alice',
				},
				username: 'alice',
			},
		});
	});

	it('expires cached sections and removes them from storage', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-03-30T12:00:00Z'));

		await setCachedFollowingSection({
			items: [{ id: 1, time: 1, title: 'story', type: 'story' }],
			username: 'alice',
		});

		vi.setSystemTime(new Date('2026-03-30T12:06:00Z'));

		await expect(getCachedFollowingSection('alice')).resolves.toBeUndefined();
		await expect(lStorage.getItem<Record<string, unknown>>(STORAGE_KEY)).resolves.toEqual({});
	});

	it('strips redundant item authors from stored cache entries', async () => {
		await setCachedFollowingSection({
			items: [{ by: 'alice', id: 1, time: 1, title: 'story', type: 'story' }],
			username: 'alice',
		});

		await expect(
			lStorage.getItem<Record<string, { items: Record<string, unknown>[] }>>(STORAGE_KEY)
		).resolves.toMatchObject({
			alice: {
				items: [{ id: 1, time: 1, title: 'story', type: 'story' }],
			},
		});
		await expect(getCachedFollowingSection('alice')).resolves.toEqual({
			items: [{ id: 1, time: 1, title: 'story', type: 'story' }],
			username: 'alice',
		});
	});
});
