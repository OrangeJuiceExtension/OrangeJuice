import { beforeEach, describe, expect, it } from 'vitest';
import lStorage from '@/utils/local-storage.ts';
import {
	getMutedUsers,
	isMutedUser,
	MUTED_USERS_STORAGE_KEY,
	setMutedUsers,
	toggleMutedUser,
} from '@/utils/muted-users.ts';

describe('muted-users', () => {
	beforeEach(async () => {
		await lStorage.setItem(MUTED_USERS_STORAGE_KEY, null);
	});

	describe('getMutedUsers', () => {
		it('returns an empty list for missing or invalid stored values', async () => {
			const cases = [
				{ name: 'empty storage', stored: null },
				{ name: 'plain string', stored: 'pg' },
				{ name: 'object', stored: { username: 'pg' } },
			] as const;

			for (const { name, stored } of cases) {
				await lStorage.setItem(MUTED_USERS_STORAGE_KEY, stored);

				await expect(getMutedUsers(), name).resolves.toEqual([]);
			}
		});

		it('normalizes stored muted users by trimming, removing empties, and deduplicating', async () => {
			await lStorage.setItem(MUTED_USERS_STORAGE_KEY, [' alice ', 'bob', '', 'alice', '  ']);

			await expect(getMutedUsers()).resolves.toEqual(['alice', 'bob']);
		});
	});

	describe('setMutedUsers', () => {
		it('deduplicates and trims muted users before storing them', async () => {
			await expect(setMutedUsers([' alice ', 'bob', 'alice', ''])).resolves.toEqual([
				'alice',
				'bob',
			]);
			await expect(getMutedUsers()).resolves.toEqual(['alice', 'bob']);
		});
	});

	describe('isMutedUser', () => {
		it('reports whether a user is muted after normalization', async () => {
			await setMutedUsers(['dang']);

			await expect(isMutedUser('dang')).resolves.toBe(true);
			await expect(isMutedUser(' dang ')).resolves.toBe(true);
			await expect(isMutedUser('pg')).resolves.toBe(false);
			await expect(isMutedUser('   ')).resolves.toBe(false);
		});
	});

	describe('toggleMutedUser', () => {
		it('toggles a user on and off', async () => {
			await expect(toggleMutedUser('pg')).resolves.toBe(true);
			await expect(getMutedUsers()).resolves.toEqual(['pg']);

			await expect(toggleMutedUser('pg')).resolves.toBe(false);
			await expect(getMutedUsers()).resolves.toEqual([]);
		});

		it('appends a new muted user without disturbing existing order', async () => {
			await setMutedUsers(['pg', 'dang']);

			await expect(toggleMutedUser('tptacek')).resolves.toBe(true);
			await expect(getMutedUsers()).resolves.toEqual(['pg', 'dang', 'tptacek']);
		});

		it('rejects empty usernames when toggling', async () => {
			await expect(toggleMutedUser('   ')).rejects.toThrow('Username is required.');
		});
	});
});
