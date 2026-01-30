import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dom } from '@/utils/dom';
import { saved } from '@/utils/saved';
import { SavedItemType } from '@/utils/types';
import { getAuthToken, toggleItemState, updateButtonAndStorage } from './saved-item-actions';

describe('saved-item-actions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getAuthToken', () => {
		it('should return cached auth token if available', async () => {
			const storedData = {
				items: new Map([
					[
						'12345',
						{
							id: '12345',
							auth: 'cached-token',
							type: SavedItemType.FavoriteComments,
						},
					],
				]),
				lastSync: 1000,
			};

			const token = await getAuthToken('12345', 'fave', storedData);

			expect(token).toBe('cached-token');
		});

		it('should fetch auth token from page if not cached', async () => {
			const storedData = {
				items: new Map(),
				lastSync: 1000,
			};

			vi.spyOn(dom, 'getPageDom').mockResolvedValue({
				querySelector: vi.fn().mockReturnValue({
					href: 'https://news.ycombinator.com/fave?id=12345&auth=fetched-token',
				}),
			} as any);

			const token = await getAuthToken('12345', 'fave', storedData);

			expect(token).toBe('fetched-token');
			expect(dom.getPageDom).toHaveBeenCalledWith(
				'https://news.ycombinator.com/item?id=12345'
			);
		});

		it('should fetch auth token for flag action', async () => {
			const storedData = {
				items: new Map(),
				lastSync: 1000,
			};

			vi.spyOn(dom, 'getPageDom').mockResolvedValue({
				querySelector: vi.fn().mockReturnValue({
					href: 'https://news.ycombinator.com/flag?id=12345&auth=flag-token',
				}),
			} as any);

			const token = await getAuthToken('12345', 'flag', storedData);

			expect(token).toBe('flag-token');
		});

		it('should update saved item with auth token if item exists', async () => {
			const storedData = {
				items: new Map([
					[
						'12345',
						{
							id: '12345',
							type: SavedItemType.FavoriteComments,
						},
					],
				]),
				lastSync: 1000,
			};

			vi.spyOn(dom, 'getPageDom').mockResolvedValue({
				querySelector: vi.fn().mockReturnValue({
					href: 'https://news.ycombinator.com/fave?id=12345&auth=new-token',
				}),
			} as any);

			const updateItemSpy = vi.spyOn(saved, 'updateItem').mockResolvedValue();

			await getAuthToken('12345', 'fave', storedData);

			expect(updateItemSpy).toHaveBeenCalledWith('12345', { auth: 'new-token' });
		});

		it('should throw error if page cannot be fetched', async () => {
			vi.spyOn(dom, 'getPageDom').mockResolvedValue(undefined);

			await expect(getAuthToken('12345', 'fave')).rejects.toThrow(
				'Failed to fetch comment page'
			);
		});

		it('should return undefined if auth link not found on page', async () => {
			vi.spyOn(dom, 'getPageDom').mockResolvedValue({
				querySelector: vi.fn().mockReturnValue(null),
			} as any);

			const token = await getAuthToken('12345', 'fave');

			expect(token).toBeUndefined();
		});
	});

	describe('toggleItemState', () => {
		it('should make correct API call to deactivate item', async () => {
			const fetchSpy = vi.fn().mockResolvedValue({
				ok: false,
				status: 302,
				statusText: 'Found',
			});
			global.fetch = fetchSpy;

			const result = await toggleItemState('12345', true, 'test-token', 'fave');

			expect(result).toBe(true);
			expect(fetchSpy).toHaveBeenCalledWith(
				'https://news.ycombinator.com/fave?id=12345&un=t&auth=test-token',
				{
					method: 'GET',
					credentials: 'include',
					redirect: 'manual',
				}
			);
		});

		it('should make correct API call to activate item', async () => {
			const fetchSpy = vi.fn().mockResolvedValue({
				ok: false,
				status: 302,
				statusText: 'Found',
			});
			global.fetch = fetchSpy;

			const result = await toggleItemState('12345', false, 'test-token', 'fave');

			expect(result).toBe(true);
			expect(fetchSpy).toHaveBeenCalledWith(
				'https://news.ycombinator.com/fave?id=12345&auth=test-token',
				{
					method: 'GET',
					credentials: 'include',
					redirect: 'manual',
				}
			);
		});

		it('should make correct API call for flag action', async () => {
			const fetchSpy = vi.fn().mockResolvedValue({
				ok: false,
				status: 302,
				statusText: 'Found',
			});
			global.fetch = fetchSpy;

			await toggleItemState('12345', false, 'test-token', 'flag');

			expect(fetchSpy).toHaveBeenCalledWith(
				'https://news.ycombinator.com/flag?id=12345&auth=test-token',
				{
					method: 'GET',
					credentials: 'include',
					redirect: 'manual',
				}
			);
		});

		it('should handle successful response with status 0', async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 0,
				statusText: '',
			});

			const result = await toggleItemState('12345', true, 'test-token', 'fave');

			expect(result).toBe(true);
		});

		it('should throw error on failed response', async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 500,
				statusText: 'Internal Server Error',
			});

			await expect(toggleItemState('12345', true, 'test-token', 'fave')).rejects.toThrow(
				'Failed to toggle fave state for comment 12345: 500 Internal Server Error'
			);
		});

		it('should throw error on 404 response', async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 404,
				statusText: 'Not Found',
			});

			await expect(toggleItemState('12345', true, 'test-token', 'flag')).rejects.toThrow(
				'Failed to toggle flag state for comment 12345: 404 Not Found'
			);
		});
	});

	describe('updateButtonAndStorage', () => {
		it('should update button text to inactive when deactivating', async () => {
			const button = document.createElement('button');
			const config = {
				itemType: SavedItemType.FavoriteComments,
				actionName: 'fave' as const,
				buttonLabels: { active: 'un-favorite', inactive: 'favorite' },
			};

			vi.spyOn(saved, 'removeFromStorage').mockResolvedValue();

			await updateButtonAndStorage(button, '12345', true, 'test-token', config);

			expect(button.textContent).toBe('favorite');
		});

		it('should update button text to active when activating', async () => {
			const button = document.createElement('button');
			const config = {
				itemType: SavedItemType.FavoriteComments,
				actionName: 'fave' as const,
				buttonLabels: { active: 'un-favorite', inactive: 'favorite' },
			};

			vi.spyOn(saved, 'addToStorage').mockResolvedValue({
				id: '12345',
				auth: 'test-token',
				type: SavedItemType.FavoriteComments,
			});

			await updateButtonAndStorage(button, '12345', false, 'test-token', config);

			expect(button.textContent).toBe('un-favorite');
		});

		it('should call removeFromStorage when deactivating', async () => {
			const button = document.createElement('button');
			const config = {
				itemType: SavedItemType.FavoriteComments,
				actionName: 'fave' as const,
				buttonLabels: { active: 'un-favorite', inactive: 'favorite' },
			};

			const removeFromStorageSpy = vi.spyOn(saved, 'removeFromStorage').mockResolvedValue();

			await updateButtonAndStorage(button, '12345', true, 'test-token', config);

			expect(removeFromStorageSpy).toHaveBeenCalledWith('12345');
		});

		it('should call addToStorage when activating', async () => {
			const button = document.createElement('button');
			const config = {
				itemType: SavedItemType.FavoriteComments,
				actionName: 'fave' as const,
				buttonLabels: { active: 'un-favorite', inactive: 'favorite' },
			};

			const addToStorageSpy = vi.spyOn(saved, 'addToStorage').mockResolvedValue({
				id: '12345',
				auth: 'test-token',
				type: SavedItemType.FavoriteComments,
			});

			await updateButtonAndStorage(button, '12345', false, 'test-token', config);

			expect(addToStorageSpy).toHaveBeenCalledWith(
				'12345',
				'test-token',
				SavedItemType.FavoriteComments
			);
		});

		it('should handle flag items correctly', async () => {
			const button = document.createElement('button');
			const config = {
				itemType: SavedItemType.FlagsComments,
				actionName: 'flag' as const,
				buttonLabels: { active: 'un-flag', inactive: 'flag' },
			};

			vi.spyOn(saved, 'addToStorage').mockResolvedValue({
				id: '12345',
				auth: 'test-token',
				type: SavedItemType.FlagsComments,
			});

			await updateButtonAndStorage(button, '12345', false, 'test-token', config);

			expect(button.textContent).toBe('un-flag');
			expect(saved.addToStorage).toHaveBeenCalledWith(
				'12345',
				'test-token',
				SavedItemType.FlagsComments
			);
		});

		it('should return undefined when deactivating', async () => {
			const button = document.createElement('button');
			const config = {
				itemType: SavedItemType.FavoriteComments,
				actionName: 'fave' as const,
				buttonLabels: { active: 'un-favorite', inactive: 'favorite' },
			};

			vi.spyOn(saved, 'removeFromStorage').mockResolvedValue();

			const result = await updateButtonAndStorage(
				button,
				'12345',
				true,
				'test-token',
				config
			);

			expect(result).toBeUndefined();
		});

		it('should return saved item when activating', async () => {
			const button = document.createElement('button');
			const config = {
				itemType: SavedItemType.FavoriteComments,
				actionName: 'fave' as const,
				buttonLabels: { active: 'un-favorite', inactive: 'favorite' },
			};

			const savedItem = {
				id: '12345',
				auth: 'test-token',
				type: SavedItemType.FavoriteComments,
			};

			vi.spyOn(saved, 'addToStorage').mockResolvedValue(savedItem);

			const result = await updateButtonAndStorage(
				button,
				'12345',
				false,
				'test-token',
				config
			);

			expect(result).toEqual(savedItem);
		});
	});
});
