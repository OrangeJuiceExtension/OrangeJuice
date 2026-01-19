import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

describe('loadSavedFromStorage', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('should return empty Map when no data stored', () => {
		const result = saved.loadSavedFromStorage();
		expect(result).toEqual(new Map());
	});

	it('should return parsed data when valid JSON stored', () => {
		const testData = [
			{ id: '123', auth: 'abc', type: SavedItemType.FavoriteComments },
			{ id: '456', auth: 'def', type: SavedItemType.FavoriteSubmissions },
		];
		localStorage.setItem('oj_saved', JSON.stringify(testData));

		const result = saved.loadSavedFromStorage();

		expect(result).toEqual(new Map([
			['123', { id: '123', auth: 'abc', type: SavedItemType.FavoriteComments }],
			['456', { id: '456', auth: 'def', type: SavedItemType.FavoriteSubmissions }],
		]));
	});

	it('should return empty Map when invalid JSON stored', () => {
		localStorage.setItem('oj_saved', 'invalid json');

		const result = saved.loadSavedFromStorage();

		expect(result).toEqual(new Map());
	});
});

describe('saveToStorage', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('should save data to localStorage', () => {
		const testData = new Map([
			['123', { id: '123', auth: 'abc', type: SavedItemType.FavoriteComments }],
			['456', { id: '456', auth: 'def', type: SavedItemType.FavoriteSubmissions }],
		]);

		saved.saveToStorage(testData);

		const stored = localStorage.getItem('oj_saved');
		const parsed = JSON.parse(stored || '[]');
		expect(parsed).toHaveLength(2);
		expect(parsed).toContainEqual({ id: '123', auth: 'abc', type: SavedItemType.FavoriteComments });
		expect(parsed).toContainEqual({ id: '456', auth: 'def', type: SavedItemType.FavoriteSubmissions });
	});

	it('should overwrite existing data', () => {
		localStorage.setItem('oj_saved', JSON.stringify([{ id: 'old', auth: 'old', type: 0 }]));

		const newData = new Map([['new', { id: 'new', auth: 'new', type: SavedItemType.FavoriteComments }]]);
		saved.saveToStorage(newData);

		const stored = localStorage.getItem('oj_saved');
		expect(stored).toBe(JSON.stringify([{ id: 'new', auth: 'new', type: SavedItemType.FavoriteComments }]));
	});
});

describe('addToStorage', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('should add new item to empty storage', () => {
		saved.addToStorage('123', 'abc', SavedItemType.FavoriteComments);

		const stored = saved.loadSavedFromStorage();
		expect(stored).toEqual(new Map([
			['123', { id: '123', auth: 'abc', type: SavedItemType.FavoriteComments }]
		]));
	});

	it('should add new item to existing storage', () => {
		saved.saveToStorage(new Map([['111', { id: '111', auth: 'aaa', type: SavedItemType.FavoriteComments }]]));

		saved.addToStorage('222', 'bbb', SavedItemType.FavoriteSubmissions);

		const stored = saved.loadSavedFromStorage();
		expect(stored.size).toBe(2);
		expect(stored.get('111')).toEqual({
			id: '111',
			auth: 'aaa',
			type: SavedItemType.FavoriteComments,
		});
		expect(stored.get('222')).toEqual({
			id: '222',
			auth: 'bbb',
			type: SavedItemType.FavoriteSubmissions,
		});
	});

	it('should not add duplicate item', () => {
		saved.saveToStorage(new Map([['123', { id: '123', auth: 'abc', type: SavedItemType.FavoriteComments }]]));

		saved.addToStorage('123', 'xyz', SavedItemType.FavoriteComments);

		const stored = saved.loadSavedFromStorage();
		expect(stored.size).toBe(1);
		expect(stored.get('123')).toEqual({ id: '123', auth: 'abc', type: SavedItemType.FavoriteComments });
	});
});

describe('removeFromStorage', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('should remove item by id', () => {
		saved.saveToStorage(new Map([
			['123', { id: '123', auth: 'abc', type: SavedItemType.FavoriteComments }],
			['456', { id: '456', auth: 'def', type: SavedItemType.FavoriteSubmissions }],
		]));

		saved.removeFromStorage('123');

		const stored = saved.loadSavedFromStorage();
		expect(stored.size).toBe(1);
		expect(stored.get('456')).toEqual({
			id: '456',
			auth: 'def',
			type: SavedItemType.FavoriteSubmissions,
		});
	});

	it('should handle removing non-existent item', () => {
		saved.saveToStorage(new Map([['123', { id: '123', auth: 'abc', type: SavedItemType.FavoriteComments }]]));

		saved.removeFromStorage('999');

		const stored = saved.loadSavedFromStorage();
		expect(stored.size).toBe(1);
		expect(stored.get('123')).toEqual({ id: '123', auth: 'abc', type: SavedItemType.FavoriteComments });
	});

	it('should handle empty storage', () => {
		saved.removeFromStorage('123');

		const stored = saved.loadSavedFromStorage();
		expect(stored).toEqual(new Map());
	});
});

describe('getAuthForItem', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('should return auth for existing item', () => {
		saved.saveToStorage(new Map([
			['123', { id: '123', auth: 'abc123', type: SavedItemType.FavoriteComments }],
			['456', { id: '456', auth: 'def456', type: SavedItemType.FavoriteSubmissions }],
		]));

		const auth = saved.getAuthForItem('123');

		expect(auth).toBe('abc123');
	});

	it('should return undefined for non-existent item', () => {
		saved.saveToStorage(new Map([['123', { id: '123', auth: 'abc123', type: SavedItemType.FavoriteComments }]]));

		const auth = saved.getAuthForItem('999');

		expect(auth).toBeUndefined();
	});

	it('should return undefined for empty storage', () => {
		const auth = saved.getAuthForItem('123');

		expect(auth).toBeUndefined();
	});
});

describe('updateItem', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('should update existing item auth', () => {
		saved.saveToStorage(new Map([
			['123', { id: '123', auth: 'abc', type: SavedItemType.FavoriteComments }],
			['456', { id: '456', auth: 'def', type: SavedItemType.FavoriteSubmissions }],
		]));

		saved.updateItem('123', { auth: 'xyz' });

		const stored = saved.loadSavedFromStorage();
		expect(stored.size).toBe(2);
		expect(stored.get('123')).toEqual({ id: '123', auth: 'xyz', type: SavedItemType.FavoriteComments });
	});

	it('should update existing item type', () => {
		saved.saveToStorage(new Map([['123', { id: '123', auth: 'abc', type: SavedItemType.FavoriteComments }]]));

		saved.updateItem('123', { type: SavedItemType.FavoriteSubmissions });

		const stored = saved.loadSavedFromStorage();
		expect(stored.get('123')).toEqual({
			id: '123',
			auth: 'abc',
			type: SavedItemType.FavoriteSubmissions,
		});
	});

	it('should update multiple fields', () => {
		saved.saveToStorage(new Map([['123', { id: '123', auth: 'abc', type: SavedItemType.FavoriteComments }]]));

		saved.updateItem('123', { auth: 'xyz', type: SavedItemType.Hidden });

		const stored = saved.loadSavedFromStorage();
		expect(stored.get('123')).toEqual({ id: '123', auth: 'xyz', type: SavedItemType.Hidden });
	});

	it('should not update if item does not exist', () => {
		saved.saveToStorage(new Map([['123', { id: '123', auth: 'abc', type: SavedItemType.FavoriteComments }]]));

		saved.updateItem('999', { auth: 'xyz' });

		const stored = saved.loadSavedFromStorage();
		expect(stored.size).toBe(1);
		expect(stored.get('123')).toEqual({ id: '123', auth: 'abc', type: SavedItemType.FavoriteComments });
	});

	it('should handle empty storage', () => {
		saved.updateItem('123', { auth: 'xyz' });

		const stored = saved.loadSavedFromStorage();
		expect(stored).toEqual(new Map());
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
		expect(result).toHaveLength(5);
		expect(result).toContainEqual({
			id: '12345',
			auth: 'abc123def456',
			type: SavedItemType.FavoriteComments,
		});
		expect(result).toContainEqual({
			id: '67890',
			auth: 'xyz789ghi012',
			type: SavedItemType.FavoriteComments,
		});
		expect(result).toContainEqual({
			id: '11111',
			auth: 'token111222',
			type: SavedItemType.FavoriteComments,
		});
		expect(result).toContainEqual({
			id: '22222',
			auth: 'token333444',
			type: SavedItemType.FavoriteComments,
		});
		expect(result).toContainEqual({
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
		expect(result).toEqual([]);
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
		expect(result).toHaveLength(2);
	});

	it('should handle null document response', async () => {
		const mockGetPageDom = vi.spyOn(dom, 'getPageDom').mockResolvedValue(undefined);

		const result = await saved.fetchAllByType('testuser', SavedItemType.FavoriteComments);

		expect(mockGetPageDom).toHaveBeenCalledTimes(1);
		expect(result).toEqual([]);
	});
});

describe('syncSaved', () => {
	beforeEach(() => {
		localStorage.clear();
		vi.clearAllMocks();
	});

	it('should sync all saved item types', async () => {
		// biome-ignore lint/suspicious/useAwait: mocked
		const mockGetPageDom = vi.spyOn(dom, 'getPageDom').mockImplementation(async () => {
			const container = document.createElement('div');
			container.innerHTML = favoritesPage2Html;
			return container;
		});
		// biome-ignore lint/suspicious/noEmptyBlockStatements: mock
		const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

		const result = await saved.syncSaved('testuser');

		expect(mockGetPageDom).toHaveBeenCalled();
		expect(result.size).toBeGreaterThan(0);
		expect(consoleSpy).toHaveBeenCalled();

		const stored = saved.loadSavedFromStorage();
		expect(stored).toEqual(result);
	});

	it('should preserve local items not yet on server', async () => {
		// Add a local favorite that hasn't synced to server yet
		saved.saveToStorage(new Map([
			['99999', { id: '99999', auth: 'localauth', type: SavedItemType.FavoriteComments }],
		]));

		// biome-ignore lint/suspicious/useAwait: mocked
		const mockGetPageDom = vi.spyOn(dom, 'getPageDom').mockImplementation(async () => {
			const container = document.createElement('div');
			container.innerHTML = favoritesPage2Html;
			return container;
		});

		const result = await saved.syncSaved('testuser');

		expect(mockGetPageDom).toHaveBeenCalled();

		// Should include both server items and local item
		expect(result.get('99999')).toEqual({
			id: '99999',
			auth: 'localauth',
			type: SavedItemType.FavoriteComments,
		});
		// Should also have server items
		expect(result.size).toBeGreaterThan(1);

		// Verify it's also saved to storage
		const stored = saved.loadSavedFromStorage();
		expect(stored.get('99999')).toEqual({
			id: '99999',
			auth: 'localauth',
			type: SavedItemType.FavoriteComments,
		});
	});

	it('should prioritize server data over local data for matching ids', async () => {
		// Add a local item with same id but different auth
		saved.saveToStorage(new Map([
			['22222', { id: '22222', auth: 'oldlocalauth', type: SavedItemType.FavoriteComments }],
		]));

		// biome-ignore lint/suspicious/useAwait: mocked
		const mockGetPageDom = vi.spyOn(dom, 'getPageDom').mockImplementation(async () => {
			const container = document.createElement('div');
			container.innerHTML = favoritesPage2Html;
			return container;
		});

		const result = await saved.syncSaved('testuser');

		expect(mockGetPageDom).toHaveBeenCalled();

		// Should use server version (token333444) not local version (oldlocalauth)
		const item = result.get('22222');
		expect(item?.auth).toBe('token333444');
		expect(item?.auth).not.toBe('oldlocalauth');
	});
});
