import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import lStorage from '@/utils/localStorage.ts';
import { SavedItemType } from '@/utils/types.ts';
import { dom } from './dom.ts';
import { saved } from './saved.ts';

const favoritesPage1Html = readFileSync(
	join(__dirname, '__fixtures__', 'hn-favorites-page1.html'),
	'utf-8'
);
const favoritesPage2Html = readFileSync(
	join(__dirname, '__fixtures__', 'hn-favorites-page2.html'),
	'utf-8'
);
const favoritesEmptyHtml = readFileSync(
	join(__dirname, '__fixtures__', 'hn-favorites-empty.html'),
	'utf-8'
);

describe('saved', () => {
	describe('loadSavedFromStorage', () => {
		beforeEach(() => {
			lStorage.clear();
		});

		it('should return empty Map when no data stored', async () => {
			const result = await saved.loadSavedFromStorage();
			expect(result).toEqual({
				items: new Map(),
				lastSync: 0,
			});
		});

		it('should return parsed data when valid JSON stored', async () => {
			const testData = {
				items: new Map([
					['123', { id: '123', auth: 'abc', type: SavedItemType.FavoriteComments }],
					['456', { id: '456', auth: 'def', type: SavedItemType.FavoriteSubmissions }],
				]),
				lastSync: 234_234,
			};

			await saved.saveToStorage(testData);

			const result = await saved.loadSavedFromStorage();

			expect(result).toEqual({
				items: new Map([
					['123', { id: '123', auth: 'abc', type: SavedItemType.FavoriteComments }],
					['456', { id: '456', auth: 'def', type: SavedItemType.FavoriteSubmissions }],
				]),
				lastSync: 234_234,
			});
		});

		it('should return empty Map when invalid JSON stored', async () => {
			lStorage.setItem('oj_saved_items', 'invalid json');

			const result = await saved.loadSavedFromStorage();

			expect(result).toEqual({
				items: new Map(),
				lastSync: 0,
			});
		});
	});

	describe('saveToStorage', () => {
		beforeEach(() => {
			lStorage.clear();
		});

		it('should save data to localStorage', async () => {
			const testData = {
				items: new Map([
					['123', { id: '123', auth: 'abc', type: SavedItemType.FavoriteComments }],
					['456', { id: '456', auth: 'def', type: SavedItemType.FavoriteSubmissions }],
				]),
				lastSync: 8888,
			};

			await saved.saveToStorage(testData);

			const parsed = await saved.loadSavedFromStorage();
			expect(parsed.items.size).toBe(2);
			expect(parsed.items).toEqual(testData.items);
			expect(parsed.lastSync).toBe(8888);
		});

		it('should overwrite existing data', async () => {
			lStorage.setItem(
				'oj_saved_items',
				JSON.stringify([{ id: 'old', auth: 'old', type: 0 }])
			);

			const newData = {
				items: new Map([
					['new', { id: 'new', auth: 'new', type: SavedItemType.FavoriteComments }],
				]),
				lastSync: 8888,
			};
			await saved.saveToStorage(newData);

			const stored = (await lStorage.getItem('oj_saved_items')) || '';
			expect(stored).toEqual({
				items: {
					new: { id: 'new', auth: 'new', type: SavedItemType.FavoriteComments },
				},
				lastSync: 8888,
			});
		});
	});

	describe('addToStorage', () => {
		beforeEach(() => {
			lStorage.clear();
		});

		it('should add new item to empty storage', async () => {
			await saved.addToStorage('123', 'abc', SavedItemType.FavoriteComments);

			const stored = await saved.loadSavedFromStorage();
			expect(stored).toEqual({
				items: new Map([
					['123', { id: '123', auth: 'abc', type: SavedItemType.FavoriteComments }],
				]),
				lastSync: 0,
			});
		});

		it('should add new item to existing storage', async () => {
			await saved.saveToStorage({
				items: new Map([
					['111', { id: '111', auth: 'aaa', type: SavedItemType.FavoriteComments }],
				]),
				lastSync: 9999,
			});

			await saved.addToStorage('222', 'bbb', SavedItemType.FavoriteSubmissions);

			const stored = await saved.loadSavedFromStorage();
			expect(stored.items.size).toBe(2);
			expect(stored.items.get('111')).toEqual({
				id: '111',
				auth: 'aaa',
				type: SavedItemType.FavoriteComments,
			});
			expect(stored.items.get('222')).toEqual({
				id: '222',
				auth: 'bbb',
				type: SavedItemType.FavoriteSubmissions,
			});
			expect(stored.lastSync).toEqual(9999);
		});

		it('should not add duplicate item', async () => {
			await saved.saveToStorage({
				items: new Map([
					['111', { id: '111', auth: 'aaa', type: SavedItemType.FavoriteComments }],
				]),
				lastSync: 9999,
			});

			await saved.addToStorage('123', 'xyz', SavedItemType.FavoriteComments);

			const stored = await saved.loadSavedFromStorage();
			expect(stored.items.size).toBe(2);
			expect(stored.items.get('123')).toEqual({
				id: '123',
				auth: 'xyz',
				type: SavedItemType.FavoriteComments,
			});
			expect(stored.lastSync).toEqual(9999);
		});
	});

	describe('removeFromStorage', () => {
		beforeEach(() => {
			lStorage.clear();
		});

		it('should remove item by id', async () => {
			await saved.saveToStorage({
				items: new Map([
					['123', { id: '123', auth: 'abc', type: SavedItemType.FavoriteComments }],
					['456', { id: '456', auth: 'def', type: SavedItemType.FavoriteSubmissions }],
				]),
				lastSync: 9999,
			});

			await saved.removeFromStorage('123');

			const stored = await saved.loadSavedFromStorage();
			expect(stored.items.size).toBe(1);
			expect(stored.items.get('456')).toEqual({
				id: '456',
				auth: 'def',
				type: SavedItemType.FavoriteSubmissions,
			});
			expect(stored.lastSync).toEqual(9999);
		});

		it('should handle removing non-existent item', async () => {
			await saved.saveToStorage({
				items: new Map([
					['123', { id: '123', auth: 'abc', type: SavedItemType.FavoriteComments }],
				]),
				lastSync: 9999,
			});

			await saved.removeFromStorage('999');

			const stored = await saved.loadSavedFromStorage();
			expect(stored.items.size).toBe(1);
			expect(stored.items.get('123')).toEqual({
				id: '123',
				auth: 'abc',
				type: SavedItemType.FavoriteComments,
			});
			expect(stored.lastSync).toEqual(9999);
		});

		it('should handle empty storage', async () => {
			await saved.removeFromStorage('123');

			const stored = await saved.loadSavedFromStorage();
			expect(stored).toEqual({
				items: new Map(),
				lastSync: 0,
			});
		});
	});

	describe('getAuthForItem', () => {
		beforeEach(() => {
			lStorage.clear();
		});

		it('should return auth for existing item', async () => {
			await saved.saveToStorage({
				items: new Map([
					['123', { id: '123', auth: 'abc123', type: SavedItemType.FavoriteComments }],
					['456', { id: '456', auth: 'def456', type: SavedItemType.FavoriteSubmissions }],
				]),
				lastSync: 9999,
			});

			const auth = await saved.getAuthForItem('123');

			expect(auth).toBe('abc123');
		});

		it('should return undefined for non-existent item', async () => {
			await saved.saveToStorage({
				items: new Map([
					['123', { id: '123', auth: 'abc123', type: SavedItemType.FavoriteComments }],
				]),
				lastSync: 9999,
			});

			const auth = await saved.getAuthForItem('999');

			expect(auth).toBeUndefined();
		});

		it('should return undefined for empty storage', async () => {
			const auth = await saved.getAuthForItem('123');

			expect(auth).toBeUndefined();
		});
	});

	describe('updateItem', () => {
		beforeEach(() => {
			lStorage.clear();
		});

		it('should update existing item auth', async () => {
			await saved.saveToStorage({
				items: new Map([
					['123', { id: '123', auth: 'abc', type: SavedItemType.FavoriteComments }],
					['456', { id: '456', auth: 'def', type: SavedItemType.FavoriteSubmissions }],
				]),
				lastSync: 9999,
			});

			await saved.updateItem('123', { auth: 'xyz' });

			const stored = await saved.loadSavedFromStorage();
			expect(stored.items.size).toBe(2);
			expect(stored.items.get('123')).toEqual({
				id: '123',
				auth: 'xyz',
				type: SavedItemType.FavoriteComments,
			});
			expect(stored.lastSync).toEqual(9999);
		});

		it('should update existing item type', async () => {
			await saved.saveToStorage({
				items: new Map([
					['123', { id: '123', auth: 'abc', type: SavedItemType.FavoriteComments }],
				]),
				lastSync: 9999,
			});

			await saved.updateItem('123', { type: SavedItemType.FavoriteSubmissions });

			const stored = await saved.loadSavedFromStorage();
			expect(stored.items.get('123')).toEqual({
				id: '123',
				auth: 'abc',
				type: SavedItemType.FavoriteSubmissions,
			});
			expect(stored.lastSync).toEqual(9999);
		});

		it('should update multiple fields', async () => {
			await saved.saveToStorage({
				items: new Map([
					['123', { id: '123', auth: 'abc', type: SavedItemType.FavoriteComments }],
				]),
				lastSync: 9999,
			});

			await saved.updateItem('123', { auth: 'xyz', type: SavedItemType.Hidden });

			const stored = await saved.loadSavedFromStorage();
			expect(stored.items.get('123')).toEqual({
				id: '123',
				auth: 'xyz',
				type: SavedItemType.Hidden,
			});
			expect(stored.lastSync).toEqual(9999);
		});

		it('should not update if item does not exist', async () => {
			await saved.saveToStorage({
				items: new Map([
					['123', { id: '123', auth: 'abc', type: SavedItemType.FavoriteComments }],
				]),
				lastSync: 9999,
			});

			await saved.updateItem('999', { auth: 'xyz' });

			const stored = await saved.loadSavedFromStorage();
			expect(stored.items.size).toBe(1);
			expect(stored.items.get('123')).toEqual({
				id: '123',
				auth: 'abc',
				type: SavedItemType.FavoriteComments,
			});
		});

		it('should handle empty storage', async () => {
			await saved.updateItem('123', { auth: 'xyz' });

			const stored = await saved.loadSavedFromStorage();
			expect(stored).toEqual({
				items: new Map(),
				lastSync: 0,
			});
		});
	});

	describe('fetchAllByType', () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should fetch favorite comments with pagination', async () => {
			const mockGetPageDom = vi
				.spyOn(dom, 'getPageDom')
				// biome-ignore lint/suspicious/useAwait: mocked
				.mockImplementation(async (url: string) => {
					if (url.includes('p=2')) {
						const container = document.createElement('div');
						container.innerHTML = favoritesPage2Html;
						return container;
					}
					const container = document.createElement('div');
					container.innerHTML = favoritesPage1Html;
					return container;
				});

			const result = await saved.fetchAllByType('testuser', SavedItemType.FavoriteComments);

			expect(mockGetPageDom).toHaveBeenCalledTimes(2);
			expect(result.size).toBe(5);
			expect(result.get('12345')).toEqual({
				id: '12345',
				auth: 'abc123def456',
				type: SavedItemType.FavoriteComments,
			});
			expect(result.get('67890')).toEqual({
				id: '67890',
				auth: 'xyz789ghi012',
				type: SavedItemType.FavoriteComments,
			});
			expect(result.get('11111')).toEqual({
				id: '11111',
				auth: 'token111222',
				type: SavedItemType.FavoriteComments,
			});
			expect(result.get('22222')).toEqual({
				id: '22222',
				auth: 'token333444',
				type: SavedItemType.FavoriteComments,
			});
			expect(result.get('33333')).toEqual({
				id: '33333',
				auth: 'token555666',
				type: SavedItemType.FavoriteComments,
			});
		});

		it('should handle empty favorites page', async () => {
			const mockGetPageDom = vi
				.spyOn(dom, 'getPageDom')
				// biome-ignore lint/suspicious/useAwait: mocked
				.mockImplementation(async (_url: string) => {
					const container = document.createElement('div');
					container.innerHTML = favoritesEmptyHtml;
					return container;
				});

			const result = await saved.fetchAllByType('testuser', SavedItemType.FavoriteComments);

			expect(mockGetPageDom).toHaveBeenCalledTimes(1);
			expect(result).toEqual(new Map());
		});

		it('should stop pagination when no more link present', async () => {
			// biome-ignore lint/suspicious/useAwait: mocked
			const mockGetPageDom = vi.spyOn(dom, 'getPageDom').mockImplementation(async () => {
				const container = document.createElement('div');
				container.innerHTML = favoritesPage2Html;
				return container;
			});

			const result = await saved.fetchAllByType('testuser', SavedItemType.FavoriteComments);

			expect(mockGetPageDom).toHaveBeenCalledTimes(1);
			expect(result.size).toBe(2);
		});

		it('should handle null document response', async () => {
			const mockGetPageDom = vi.spyOn(dom, 'getPageDom').mockResolvedValue(undefined);

			const result = await saved.fetchAllByType('testuser', SavedItemType.FavoriteComments);

			expect(mockGetPageDom).toHaveBeenCalledTimes(1);
			expect(result).toEqual(new Map());
		});
	});

	describe('syncSaved', () => {
		beforeEach(() => {
			lStorage.clear();
			vi.clearAllMocks();
		});

		it('should sync all saved item types', async () => {
			// biome-ignore lint/suspicious/useAwait: mocked
			const mockGetPageDom = vi.spyOn(dom, 'getPageDom').mockImplementation(async () => {
				const container = document.createElement('div');
				container.innerHTML = favoritesPage2Html;
				return container;
			});

			const result = await saved.syncSaved('testuser');

			expect(mockGetPageDom).toHaveBeenCalled();
			expect(result.items.size).toBeGreaterThan(0);

			const stored = await saved.loadSavedFromStorage();
			expect(stored).toEqual(result);
		});

		it('should preserve local items not yet on server', async () => {
			// Add a local favorite that hasn't synced to server yet
			saved.saveToStorage({
				items: new Map([
					[
						'99999',
						{ id: '99999', auth: 'localauth', type: SavedItemType.FavoriteComments },
					],
				]),
				lastSync: 8888,
			});

			// biome-ignore lint/suspicious/useAwait: mocked
			const mockGetPageDom = vi.spyOn(dom, 'getPageDom').mockImplementation(async () => {
				const container = document.createElement('div');
				container.innerHTML = favoritesPage2Html;
				return container;
			});

			const result = await saved.syncSaved('testuser');

			expect(mockGetPageDom).toHaveBeenCalled();

			// Should include both server items and local item
			expect(result.items.get('99999')).toEqual({
				id: '99999',
				auth: 'localauth',
				type: SavedItemType.FavoriteComments,
			});
			// Should also have server items
			expect(result.items.size).toBeGreaterThan(1);

			// Verify it's also saved to storage
			const stored = await saved.loadSavedFromStorage();
			expect(stored.items.get('99999')).toEqual({
				id: '99999',
				auth: 'localauth',
				type: SavedItemType.FavoriteComments,
			});
		});

		it('should prioritize server data over local data for matching ids', async () => {
			// Add a local item with same id but different auth
			saved.saveToStorage({
				items: new Map([
					[
						'22222',
						{ id: '22222', auth: 'oldlocalauth', type: SavedItemType.FavoriteComments },
					],
				]),
				lastSync: 8888,
			});

			// biome-ignore lint/suspicious/useAwait: mocked
			const mockGetPageDom = vi.spyOn(dom, 'getPageDom').mockImplementation(async () => {
				const container = document.createElement('div');
				container.innerHTML = favoritesPage2Html;
				return container;
			});

			const result = await saved.syncSaved('testuser');

			expect(mockGetPageDom).toHaveBeenCalled();

			// Should use a server version (token333444) not local version (oldlocalauth)
			const item = result.items.get('22222');
			expect(item?.auth).toBe('token333444');
			expect(item?.auth).not.toBe('oldlocalauth');
		});

		it('should return cached data if reload is true (within sync interval)', async () => {
			vi.useFakeTimers();
			const now = 1_000_000;
			vi.setSystemTime(now);

			// Set lastSync to be recent (within 30 days)
			const recentSync = now - 5 * 24 * 60 * 60 * 1000; // 5 days ago
			saved.saveToStorage({
				items: new Map([
					[
						'99999',
						{ id: '99999', auth: 'cached', type: SavedItemType.FavoriteComments },
					],
				]),
				lastSync: recentSync,
			});

			const mockGetPageDom = vi.spyOn(dom, 'getPageDom');

			const result = await saved.syncSaved('testuser');

			// Should NOT call getPageDom because it returns early
			expect(mockGetPageDom).not.toHaveBeenCalled();

			// Should return the cached data
			expect(result.items.get('99999')).toEqual({
				id: '99999',
				auth: 'cached',
				type: SavedItemType.FavoriteComments,
			});
			expect(result.lastSync).toBe(recentSync);

			vi.useRealTimers();
		});

		it('should fetch new data if reload is false (outside sync interval)', async () => {
			vi.useFakeTimers();
			const now = 1_000_000;
			vi.setSystemTime(now);

			// Set lastSync to be old (more than 30 days ago)
			const oldSync = now - 31 * 24 * 60 * 60 * 1000; // 31 days ago
			saved.saveToStorage({
				items: new Map([
					[
						'99999',
						{ id: '99999', auth: 'cached', type: SavedItemType.FavoriteComments },
					],
				]),
				lastSync: oldSync,
			});

			// biome-ignore lint/suspicious/useAwait: mocked
			const mockGetPageDom = vi.spyOn(dom, 'getPageDom').mockImplementation(async () => {
				const container = document.createElement('div');
				container.innerHTML = favoritesPage2Html;
				return container;
			});

			const result = await saved.syncSaved('testuser');

			// Should call getPageDom to fetch fresh data
			expect(mockGetPageDom).toHaveBeenCalled();

			// Should have new lastSync timestamp
			expect(result.lastSync).toBe(now);

			vi.useRealTimers();
		});
	});
});
