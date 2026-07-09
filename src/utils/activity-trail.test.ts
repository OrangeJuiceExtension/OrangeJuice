import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DAYS_1, DAYS_30 } from '@/utils/constants.ts';
import lStorage from '@/utils/local-storage.ts';
import { type ActivityDetail, ActivityId, ActivityTrail } from './activity-trail.ts';

const FIXED_NOW = new Date('2023-01-01T00:00:00.000Z').getTime();

vi.mock('@/utils/local-storage.ts', () => ({
	default: {
		clear: vi.fn(async () => {}),
		getItem: vi.fn(async () => null),
		setItem: vi.fn(async () => {}),
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
				exp: Date.now() + DAYS_30,
				id: '123',
				type: ActivityId.Comments,
			};

			await activityTrail.set(activity);
			const result = await activityTrail.get({ id: '123', type: ActivityId.Comments });

			expect(result).toEqual(activity);
		});

		it('should store and retrieve an activity with auth', async () => {
			const activity: ActivityDetail = {
				auth: 'test-auth-token',
				exp: Date.now() + DAYS_30,
				id: '456',
				type: ActivityId.FavoriteSubmissions,
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
				exp: Date.now() + DAYS_30,
				id: '789',
				type: ActivityId.Submissions,
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
				exp: Date.now() + 1000,
				id: '100',
				type: ActivityId.Hidden,
			};

			const activity2: ActivityDetail = {
				exp: Date.now() + 2000,
				id: '100',
				type: ActivityId.Hidden,
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
				exp: Date.now() + DAYS_30,
				id: '200',
				type: ActivityId.VotesSubmissions,
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
				exp: Date.now() + DAYS_30,
				id: '999',
				type: ActivityId.Comments,
			};

			const removed = await activityTrail.remove(activity);
			expect(removed).toBe(false);
		});
	});

	describe('addActivities', () => {
		it('should add multiple activities at once', async () => {
			const activities: ActivityDetail[] = [
				{ exp: Date.now() + DAYS_30, id: '1', type: ActivityId.Comments },
				{ exp: Date.now() + DAYS_30, id: '2', type: ActivityId.Submissions },
				{ exp: Date.now() + DAYS_30, id: '3', type: ActivityId.Hidden },
			];

			await activityTrail.addActivities(activities);

			await Promise.all(
				activities.map(async (activity) => {
					const result = await activityTrail.get({
						id: activity.id,
						type: activity.type,
					});
					expect(result).toEqual(activity);
				})
			);
		});

		it('should add activities with same type', async () => {
			const activities: ActivityDetail[] = [
				{ exp: Date.now() + DAYS_30, id: '10', type: ActivityId.Comments },
				{ exp: Date.now() + DAYS_30, id: '11', type: ActivityId.Comments },
				{ exp: Date.now() + DAYS_30, id: '12', type: ActivityId.Comments },
			];

			await activityTrail.addActivities(activities);

			await Promise.all(
				activities.map(async (activity) => {
					const result = await activityTrail.get({
						id: activity.id,
						type: activity.type,
					});
					expect(result).toEqual(activity);
				})
			);
		});

		it('should add activities with auth tokens', async () => {
			const activities: ActivityDetail[] = [
				{
					auth: 'auth1',
					exp: Date.now() + DAYS_30,
					id: '20',
					type: ActivityId.FavoriteSubmissions,
				},
				{
					auth: 'auth2',
					exp: Date.now() + DAYS_30,
					id: '21',
					type: ActivityId.FavoriteComments,
				},
			];

			await activityTrail.addActivities(activities);

			await Promise.all(
				activities.map(async (activity) => {
					const result = await activityTrail.get({
						id: activity.id,
						type: activity.type,
					});
					expect(result).toEqual(activity);
				})
			);
		});
	});

	describe('listeners', () => {
		it('should notify listener when activity is set', async () => {
			const listener = vi.fn(async () => {});
			activityTrail.addListener(listener);

			const activity: ActivityDetail = {
				exp: Date.now() + DAYS_30,
				id: '300',
				type: ActivityId.FlagsComments,
			};

			await activityTrail.set(activity);

			expect(listener).toHaveBeenCalledTimes(1);
			expect(listener).toHaveBeenCalledWith(activity);
		});

		it('should notify listener when activity is removed', async () => {
			const listener = vi.fn(async () => {});

			const activity: ActivityDetail = {
				exp: Date.now() + DAYS_30,
				id: '400',
				type: ActivityId.VotesComments,
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
				exp: Date.now() + DAYS_30,
				id: '500',
				type: ActivityId.FavoriteComments,
			};

			await activityTrail.set(activity);

			expect(listener1).toHaveBeenCalledTimes(1);
			expect(listener2).toHaveBeenCalledTimes(1);
		});

		it('should remove listener using returned cleanup function', async () => {
			const listener = vi.fn(async () => {});
			const cleanup = activityTrail.addListener(listener);

			const activity: ActivityDetail = {
				exp: Date.now() + DAYS_30,
				id: '600',
				type: ActivityId.Hidden,
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
				exp: Date.now() + DAYS_30,
				id: '700',
				type: ActivityId.Submissions,
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
				{ exp: Date.now() + DAYS_30, id: '800', type: ActivityId.Comments },
				{ exp: Date.now() + DAYS_30, id: '801', type: ActivityId.Submissions },
			];

			await activityTrail.addActivities(activities);

			expect(listener).not.toHaveBeenCalled();
		});
	});

	describe('persistence', () => {
		it('should load data from localStorage', async () => {
			const storedData = {
				items: {
					[ActivityId.Comments]: [{ exp: Date.now() + DAYS_30, id: '900' }],
				},
				lastSync: Date.now(),
			};

			vi.mocked(lStorage.getItem).mockResolvedValueOnce(storedData);

			const trail = new ActivityTrail();
			const result = await trail.get({ id: '900', type: ActivityId.Comments });

			expect(result).toEqual({
				exp: storedData.items[ActivityId.Comments][0].exp,
				id: '900',
				type: ActivityId.Comments,
			});
		});

		it('should save data to localStorage when setting activity', async () => {
			const activity: ActivityDetail = {
				exp: Date.now() + DAYS_30,
				id: '1000',
				type: ActivityId.Submissions,
			};

			await activityTrail.set(activity);

			expect(lStorage.setItem).toHaveBeenCalled();
			const [callArgs] = vi.mocked(lStorage.setItem).mock.calls;
			expect(callArgs[0]).toBe('oj_activity_trail');
			expect(callArgs[1]).toHaveProperty('items');
			expect(callArgs[1]).toHaveProperty('lastSync');
		});

		it('should update lastSync timestamp when saving', async () => {
			const beforeTime = Date.now();

			const activity: ActivityDetail = {
				exp: Date.now() + DAYS_30,
				id: '1100',
				type: ActivityId.Hidden,
			};

			await activityTrail.set(activity);

			const afterTime = Date.now();
			const [callArgs] = vi.mocked(lStorage.setItem).mock.calls;
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
		beforeEach(() => {
			vi.useFakeTimers();
			vi.setSystemTime(FIXED_NOW);
		});

		afterEach(() => {
			vi.useRealTimers();
		});

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
				lastSync: FIXED_NOW - DAYS_1 - 1000,
			});

			const expired = await activityTrail.isExpired();
			expect(expired).toBe(true);
		});

		it('should return false when data is fresh', async () => {
			vi.mocked(lStorage.getItem).mockResolvedValueOnce({
				items: {},
				lastSync: FIXED_NOW - 1000, // 1 second ago
			});

			const expired = await activityTrail.isExpired();
			expect(expired).toBe(false);
		});

		it('should return false when data is exactly 1 day old', async () => {
			vi.mocked(lStorage.getItem).mockResolvedValueOnce({
				items: {},
				lastSync: FIXED_NOW - DAYS_1,
			});

			const expired = await activityTrail.isExpired();
			expect(expired).toBe(false);
		});
	});

	describe('toStored', () => {
		it('should convert indexed data to stored format', async () => {
			const activities: ActivityDetail[] = [
				{ exp: Date.now() + DAYS_30, id: '1200', type: ActivityId.Comments },
				{
					auth: 'test-auth',
					exp: Date.now() + DAYS_30,
					id: '1201',
					type: ActivityId.Submissions,
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
				exp: Date.now() + DAYS_30,
				id: '1300',
				type: ActivityId.Hidden,
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
				auth: 'secret-auth',
				exp: Date.now() + DAYS_30,
				id: '1400',
				type: ActivityId.FavoriteSubmissions,
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
				{ exp: Date.now() + DAYS_30, id: '1', type: ActivityId.Comments },
				{ exp: Date.now() + DAYS_30, id: '1', type: ActivityId.Submissions },
				{ exp: Date.now() + DAYS_30, id: '1', type: ActivityId.Hidden },
			];

			await activityTrail.addActivities(activities);

			await Promise.all(
				activities.map(async (activity) => {
					const result = await activityTrail.get({ id: '1', type: activity.type });
					expect(result).toEqual(activity);
				})
			);
		});

		it('should only remove activity of specified type', async () => {
			const activity1: ActivityDetail = {
				exp: Date.now() + DAYS_30,
				id: '2',
				type: ActivityId.Comments,
			};

			const activity2: ActivityDetail = {
				exp: Date.now() + DAYS_30,
				id: '2',
				type: ActivityId.Submissions,
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
