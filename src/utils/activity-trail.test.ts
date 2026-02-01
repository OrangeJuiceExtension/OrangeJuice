import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DAYS_1, DAYS_30 } from '@/utils/constants.ts';
import lStorage from '@/utils/localStorage.ts';
import { type ActivityDetail, ActivityId, ActivityTrail } from './activity-trail.ts';

vi.mock('@/utils/localStorage.ts', () => ({
	default: {
		getItem: vi.fn(async () => null),
		setItem: vi.fn(async () => {}),
		clear: vi.fn(async () => {}),
	},
}));

describe('ActivityTrail', () => {
	let activityTrail: ActivityTrail;

	beforeEach(() => {
		activityTrail = new ActivityTrail();
		vi.clearAllMocks();
	});

	describe('set and get', () => {
		it('should store and retrieve an activity by id and type', async () => {
			const activity: ActivityDetail = {
				id: '123',
				type: ActivityId.Comments,
				exp: Date.now() + DAYS_30,
			};

			await activityTrail.set(activity);
			const result = await activityTrail.get({ id: '123', type: ActivityId.Comments });

			expect(result).toEqual(activity);
		});

		it('should store and retrieve an activity with auth', async () => {
			const activity: ActivityDetail = {
				id: '456',
				type: ActivityId.FavoriteSubmissions,
				auth: 'test-auth-token',
				exp: Date.now() + DAYS_30,
			};

			await activityTrail.set(activity);
			const result = await activityTrail.get({
				id: '456',
				type: ActivityId.FavoriteSubmissions,
			});

			expect(result).toEqual(activity);
		});

		it('should retrieve activity by id only when type is not provided', async () => {
			const activity: ActivityDetail = {
				id: '789',
				type: ActivityId.Submissions,
				exp: Date.now() + DAYS_30,
			};

			await activityTrail.set(activity);
			const result = await activityTrail.get({ id: '789' });

			expect(result).toEqual(activity);
		});

		it('should return undefined for non-existent activity', async () => {
			const result = await activityTrail.get({ id: '999', type: ActivityId.Comments });
			expect(result).toBeUndefined();
		});

		it('should overwrite existing activity with same id and type', async () => {
			const activity1: ActivityDetail = {
				id: '100',
				type: ActivityId.Hidden,
				exp: Date.now() + 1000,
			};

			const activity2: ActivityDetail = {
				id: '100',
				type: ActivityId.Hidden,
				exp: Date.now() + 2000,
			};

			await activityTrail.set(activity1);
			await activityTrail.set(activity2);

			const result = await activityTrail.get({ id: '100', type: ActivityId.Hidden });
			expect(result).toEqual(activity2);
		});
	});

	describe('remove', () => {
		it('should remove an existing activity', async () => {
			const activity: ActivityDetail = {
				id: '200',
				type: ActivityId.VotesSubmissions,
				exp: Date.now() + DAYS_30,
			};

			await activityTrail.set(activity);
			const removed = await activityTrail.remove(activity);

			expect(removed).toBe(true);

			const result = await activityTrail.get({
				id: '200',
				type: ActivityId.VotesSubmissions,
			});
			expect(result).toBeUndefined();
		});

		it('should return false when removing non-existent activity', async () => {
			const activity: ActivityDetail = {
				id: '999',
				type: ActivityId.Comments,
				exp: Date.now() + DAYS_30,
			};

			const removed = await activityTrail.remove(activity);
			expect(removed).toBe(false);
		});
	});

	describe('addActivities', () => {
		it('should add multiple activities at once', async () => {
			const activities: ActivityDetail[] = [
				{ id: '1', type: ActivityId.Comments, exp: Date.now() + DAYS_30 },
				{ id: '2', type: ActivityId.Submissions, exp: Date.now() + DAYS_30 },
				{ id: '3', type: ActivityId.Hidden, exp: Date.now() + DAYS_30 },
			];

			await activityTrail.addActivities(activities);

			for (const activity of activities) {
				const result = await activityTrail.get({ id: activity.id, type: activity.type });
				expect(result).toEqual(activity);
			}
		});

		it('should add activities with same type', async () => {
			const activities: ActivityDetail[] = [
				{ id: '10', type: ActivityId.Comments, exp: Date.now() + DAYS_30 },
				{ id: '11', type: ActivityId.Comments, exp: Date.now() + DAYS_30 },
				{ id: '12', type: ActivityId.Comments, exp: Date.now() + DAYS_30 },
			];

			await activityTrail.addActivities(activities);

			for (const activity of activities) {
				const result = await activityTrail.get({ id: activity.id, type: activity.type });
				expect(result).toEqual(activity);
			}
		});

		it('should add activities with auth tokens', async () => {
			const activities: ActivityDetail[] = [
				{
					id: '20',
					type: ActivityId.FavoriteSubmissions,
					auth: 'auth1',
					exp: Date.now() + DAYS_30,
				},
				{
					id: '21',
					type: ActivityId.FavoriteComments,
					auth: 'auth2',
					exp: Date.now() + DAYS_30,
				},
			];

			await activityTrail.addActivities(activities);

			for (const activity of activities) {
				const result = await activityTrail.get({ id: activity.id, type: activity.type });
				expect(result).toEqual(activity);
			}
		});
	});

	describe('listeners', () => {
		it('should notify listener when activity is set', async () => {
			const listener = vi.fn(async () => {});
			activityTrail.addListener(listener);

			const activity: ActivityDetail = {
				id: '300',
				type: ActivityId.FlagsComments,
				exp: Date.now() + DAYS_30,
			};

			await activityTrail.set(activity);

			expect(listener).toHaveBeenCalledTimes(1);
			expect(listener).toHaveBeenCalledWith(activity);
		});

		it('should notify listener when activity is removed', async () => {
			const listener = vi.fn(async () => {});

			const activity: ActivityDetail = {
				id: '400',
				type: ActivityId.VotesComments,
				exp: Date.now() + DAYS_30,
			};

			await activityTrail.set(activity);
			activityTrail.addListener(listener);
			await activityTrail.remove(activity);

			expect(listener).toHaveBeenCalledTimes(1);
			expect(listener).toHaveBeenCalledWith(activity);
		});

		it('should notify multiple listeners', async () => {
			const listener1 = vi.fn(async () => {});
			const listener2 = vi.fn(async () => {});

			activityTrail.addListener(listener1);
			activityTrail.addListener(listener2);

			const activity: ActivityDetail = {
				id: '500',
				type: ActivityId.FavoriteComments,
				exp: Date.now() + DAYS_30,
			};

			await activityTrail.set(activity);

			expect(listener1).toHaveBeenCalledTimes(1);
			expect(listener2).toHaveBeenCalledTimes(1);
		});

		it('should remove listener using returned cleanup function', async () => {
			const listener = vi.fn(async () => {});
			const cleanup = activityTrail.addListener(listener);

			const activity: ActivityDetail = {
				id: '600',
				type: ActivityId.Hidden,
				exp: Date.now() + DAYS_30,
			};

			await activityTrail.set(activity);
			expect(listener).toHaveBeenCalledTimes(1);

			cleanup();

			await activityTrail.set({ ...activity, id: '601' });
			expect(listener).toHaveBeenCalledTimes(1); // not called again
		});

		it('should remove listener using removeListener method', async () => {
			const listener = vi.fn(async () => {});
			activityTrail.addListener(listener);

			const activity: ActivityDetail = {
				id: '700',
				type: ActivityId.Submissions,
				exp: Date.now() + DAYS_30,
			};

			await activityTrail.set(activity);
			expect(listener).toHaveBeenCalledTimes(1);

			activityTrail.removeListener(listener);

			await activityTrail.set({ ...activity, id: '701' });
			expect(listener).toHaveBeenCalledTimes(1); // not called again
		});

		it('should not notify listeners when addActivities is called', async () => {
			const listener = vi.fn(async () => {});
			activityTrail.addListener(listener);

			const activities: ActivityDetail[] = [
				{ id: '800', type: ActivityId.Comments, exp: Date.now() + DAYS_30 },
				{ id: '801', type: ActivityId.Submissions, exp: Date.now() + DAYS_30 },
			];

			await activityTrail.addActivities(activities);

			expect(listener).not.toHaveBeenCalled();
		});
	});

	describe('persistence', () => {
		it('should load data from localStorage', async () => {
			const storedData = {
				items: {
					[ActivityId.Comments]: [{ id: '900', exp: Date.now() + DAYS_30 }],
				},
				lastSync: Date.now(),
			};

			vi.mocked(lStorage.getItem).mockResolvedValueOnce(storedData);

			const trail = new ActivityTrail();
			const result = await trail.get({ id: '900', type: ActivityId.Comments });

			expect(result).toEqual({
				id: '900',
				type: ActivityId.Comments,
				exp: storedData.items[ActivityId.Comments][0].exp,
			});
		});

		it('should save data to localStorage when setting activity', async () => {
			const activity: ActivityDetail = {
				id: '1000',
				type: ActivityId.Submissions,
				exp: Date.now() + DAYS_30,
			};

			await activityTrail.set(activity);

			expect(lStorage.setItem).toHaveBeenCalled();
			const callArgs = vi.mocked(lStorage.setItem).mock.calls[0];
			expect(callArgs[0]).toBe('oj_activity_trail');
			expect(callArgs[1]).toHaveProperty('items');
			expect(callArgs[1]).toHaveProperty('lastSync');
		});

		it('should update lastSync timestamp when saving', async () => {
			const beforeTime = Date.now();

			const activity: ActivityDetail = {
				id: '1100',
				type: ActivityId.Hidden,
				exp: Date.now() + DAYS_30,
			};

			await activityTrail.set(activity);

			const afterTime = Date.now();
			const callArgs = vi.mocked(lStorage.setItem).mock.calls[0];
			const savedData = callArgs[1] as { lastSync: number };

			expect(savedData.lastSync).toBeGreaterThanOrEqual(beforeTime);
			expect(savedData.lastSync).toBeLessThanOrEqual(afterTime);
		});

		it('should return empty data when localStorage has no data', async () => {
			vi.mocked(lStorage.getItem).mockResolvedValueOnce(null);

			const trail = new ActivityTrail();
			const result = await trail.get({ id: '999', type: ActivityId.Comments });

			expect(result).toBeUndefined();
		});
	});

	describe('isExpired', () => {
		it('should return true when lastSync is 0', async () => {
			vi.mocked(lStorage.getItem).mockResolvedValueOnce({
				items: {},
				lastSync: 0,
			});

			const expired = await activityTrail.isExpired();
			expect(expired).toBe(true);
		});

		it('should return true when data is older than 1 day', async () => {
			vi.mocked(lStorage.getItem).mockResolvedValueOnce({
				items: {},
				lastSync: Date.now() - DAYS_1 - 1000,
			});

			const expired = await activityTrail.isExpired();
			expect(expired).toBe(true);
		});

		it('should return false when data is fresh', async () => {
			vi.mocked(lStorage.getItem).mockResolvedValueOnce({
				items: {},
				lastSync: Date.now() - 1000, // 1 second ago
			});

			const expired = await activityTrail.isExpired();
			expect(expired).toBe(false);
		});

		it('should return false when data is exactly 1 day old', async () => {
			vi.mocked(lStorage.getItem).mockResolvedValueOnce({
				items: {},
				lastSync: Date.now() - DAYS_1,
			});

			const expired = await activityTrail.isExpired();
			expect(expired).toBe(false);
		});
	});

	describe('toStored', () => {
		it('should convert indexed data to stored format', async () => {
			const activities: ActivityDetail[] = [
				{ id: '1200', type: ActivityId.Comments, exp: Date.now() + DAYS_30 },
				{
					id: '1201',
					type: ActivityId.Submissions,
					exp: Date.now() + DAYS_30,
					auth: 'test-auth',
				},
			];

			await activityTrail.addActivities(activities);
			const stored = await activityTrail.toStored();

			expect(stored.items[ActivityId.Comments]).toBeDefined();
			expect(stored.items[ActivityId.Submissions]).toBeDefined();
			expect(stored.lastSync).toBeGreaterThan(0);
		});

		it('should omit type from stored items', async () => {
			const activity: ActivityDetail = {
				id: '1300',
				type: ActivityId.Hidden,
				exp: Date.now() + DAYS_30,
			};

			await activityTrail.set(activity);
			const stored = await activityTrail.toStored();

			const storedItem = stored.items[ActivityId.Hidden]?.[0];
			expect(storedItem).toBeDefined();
			expect(storedItem).not.toHaveProperty('type');
			expect(storedItem).toHaveProperty('id');
			expect(storedItem).toHaveProperty('exp');
		});

		it('should preserve auth in stored format', async () => {
			const activity: ActivityDetail = {
				id: '1400',
				type: ActivityId.FavoriteSubmissions,
				auth: 'secret-auth',
				exp: Date.now() + DAYS_30,
			};

			await activityTrail.set(activity);
			const stored = await activityTrail.toStored();

			const storedItem = stored.items[ActivityId.FavoriteSubmissions]?.[0];
			expect(storedItem).toHaveProperty('auth', 'secret-auth');
		});
	});

	describe('multiple activity types', () => {
		it('should handle different activity types independently', async () => {
			const activities: ActivityDetail[] = [
				{ id: '1', type: ActivityId.Comments, exp: Date.now() + DAYS_30 },
				{ id: '1', type: ActivityId.Submissions, exp: Date.now() + DAYS_30 },
				{ id: '1', type: ActivityId.Hidden, exp: Date.now() + DAYS_30 },
			];

			for (const activity of activities) {
				await activityTrail.set(activity);
			}

			for (const activity of activities) {
				const result = await activityTrail.get({ id: '1', type: activity.type });
				expect(result).toEqual(activity);
			}
		});

		it('should only remove activity of specified type', async () => {
			const activity1: ActivityDetail = {
				id: '2',
				type: ActivityId.Comments,
				exp: Date.now() + DAYS_30,
			};

			const activity2: ActivityDetail = {
				id: '2',
				type: ActivityId.Submissions,
				exp: Date.now() + DAYS_30,
			};

			await activityTrail.set(activity1);
			await activityTrail.set(activity2);

			await activityTrail.remove(activity1);

			const result1 = await activityTrail.get({ id: '2', type: ActivityId.Comments });
			const result2 = await activityTrail.get({ id: '2', type: ActivityId.Submissions });

			expect(result1).toBeUndefined();
			expect(result2).toEqual(activity2);
		});
	});
});
