import { beforeEach, describe, expect, it } from 'vitest';
import {
	FOLLOWED_USERS_STORAGE_KEY,
	getFollowedUsers,
	isFollowingUser,
	setFollowedUsers,
	toggleFollowedUser,
} from '@/utils/followed-users.ts';
import lStorage from '@/utils/local-storage.ts';

describe('followed-users', () => {
	beforeEach(async () => {
		await lStorage.setItem(FOLLOWED_USERS_STORAGE_KEY, null);
	});

	describe('getFollowedUsers', () => {
		it('returns an empty list for missing or invalid stored values', async () => {
			const cases = [
				{ name: 'empty storage', stored: null },
				{ name: 'plain string', stored: 'pg' },
				{ name: 'object', stored: { username: 'pg' } },
			] as const;

			for (const { name, stored } of cases) {
				await lStorage.setItem(FOLLOWED_USERS_STORAGE_KEY, stored);

				await expect(getFollowedUsers(), name).resolves.toEqual([]);
			}
		});

		it('normalizes stored followed users by trimming, removing empties, and deduplicating', async () => {
			await lStorage.setItem(FOLLOWED_USERS_STORAGE_KEY, [
				' alice ',
				'bob',
				'',
				'alice',
				'  ',
			]);

			await expect(getFollowedUsers()).resolves.toEqual(['alice', 'bob']);
		});
	});

	describe('setFollowedUsers', () => {
		it('deduplicates and trims followed users before storing them', async () => {
			await expect(setFollowedUsers([' alice ', 'bob', 'alice', ''])).resolves.toEqual([
				'alice',
				'bob',
			]);
			await expect(getFollowedUsers()).resolves.toEqual(['alice', 'bob']);
		});

		it('stores an empty list when all usernames are blank', async () => {
			await expect(setFollowedUsers(['', '   '])).resolves.toEqual([]);
			await expect(getFollowedUsers()).resolves.toEqual([]);
		});
	});

	describe('isFollowingUser', () => {
		it('reports whether a user is followed after normalization', async () => {
			await setFollowedUsers(['dang']);

			await expect(isFollowingUser('dang')).resolves.toBe(true);
			await expect(isFollowingUser(' dang ')).resolves.toBe(true);
			await expect(isFollowingUser('pg')).resolves.toBe(false);
			await expect(isFollowingUser('   ')).resolves.toBe(false);
		});
	});

	describe('toggleFollowedUser', () => {
		it('toggles a user on and off', async () => {
			await expect(toggleFollowedUser('pg')).resolves.toBe(true);
			await expect(getFollowedUsers()).resolves.toEqual(['pg']);

			await expect(toggleFollowedUser('pg')).resolves.toBe(false);
			await expect(getFollowedUsers()).resolves.toEqual([]);
		});

		it('toggles an existing trimmed username off', async () => {
			await setFollowedUsers(['pg', 'dang']);

			await expect(toggleFollowedUser(' pg ')).resolves.toBe(false);
			await expect(getFollowedUsers()).resolves.toEqual(['dang']);
		});

		it('appends a new followed user without disturbing existing order', async () => {
			await setFollowedUsers(['pg', 'dang']);

			await expect(toggleFollowedUser('tptacek')).resolves.toBe(true);
			await expect(getFollowedUsers()).resolves.toEqual(['pg', 'dang', 'tptacek']);
		});

		it('rejects empty usernames when toggling', async () => {
			await expect(toggleFollowedUser('   ')).rejects.toThrow('Username is required.');
		});
	});
});
