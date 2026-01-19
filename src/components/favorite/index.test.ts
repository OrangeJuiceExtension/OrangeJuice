/** biome-ignore-all lint/suspicious/noEmptyBlockStatements: mocks */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dom } from '@/utils/dom';
import { saved } from '@/utils/saved';
import type { OJContext, SavedItem } from '@/utils/types';
import { SavedItemType } from '@/utils/types';
import { initFavorites } from './index';

const fixtureHtml = readFileSync(
	join(__dirname, '__fixtures__', 'hn-item-with-favorites.html'),
	'utf-8'
);

const frontpageFixtureHtml = readFileSync(
	join(__dirname, '__fixtures__', 'hn-frontpage-with-favorites.html'),
	'utf-8'
);

describe('initFavorites', () => {
	let mockOjContext: OJContext;
	let mockFavorites: Map<string, SavedItem>;

	beforeEach(() => {
		document.body.innerHTML = fixtureHtml;
		Object.defineProperty(window, 'location', {
			value: { pathname: '/item' },
			writable: true,
		});

		mockFavorites = new Map([
			[
				'46671233',
				{
					id: '46671233',
					auth: 'test-auth-token-1',
					type: SavedItemType.FavoriteComments,
				},
			],
			[
				'46671239',
				{
					id: '46671239',
					auth: 'test-auth-token-2',
					type: SavedItemType.FavoriteComments,
				},
			],
		]);

		mockOjContext = {
			user: {
				username: 'testuser',
			},
			favorites: mockFavorites,
		};

		// Clear all mocks
		vi.clearAllMocks();
	});

	it('should add favorite/un-favorite buttons to comments', () => {
		initFavorites(document, mockOjContext);

		const buttons = document.querySelectorAll('.oj-link-button');
		expect(buttons.length).toBeGreaterThan(0);
	});

	it('should display "un-favorite" for already favorited items', () => {
		initFavorites(document, mockOjContext);

		const buttons = document.querySelectorAll('.oj-link-button');
		const firstButton = buttons[0] as HTMLButtonElement;

		expect(firstButton?.textContent).toBe('un-favorite');
	});

	it('should display "favorite" for non-favorited items', () => {
		mockOjContext.favorites = new Map();
		initFavorites(document, mockOjContext);

		const buttons = document.querySelectorAll('.oj-link-button');
		expect(buttons.length).toBe(2);
		const firstButton = buttons[0] as HTMLButtonElement;

		expect(firstButton?.textContent).toBe('favorite');
	});

	it('should toggle button text from "un-favorite" to "favorite" after successful unfavorite', async () => {
		// Mock successful API response with 302 redirect
		global.fetch = vi.fn().mockResolvedValue({
			ok: false, // This is the bug - response.ok is false for 302
			status: 302,
			statusText: 'Found',
		});

		// Mock saved.removeFromStorage
		vi.spyOn(saved, 'removeFromStorage').mockImplementation(() => {});

		initFavorites(document, mockOjContext);

		const buttons = document.querySelectorAll('.oj-link-button');
		const button = buttons[0] as HTMLButtonElement;

		expect(button?.textContent).toBe('un-favorite');

		// Click to unfavorite
		button.click();

		// Wait for async operations
		await vi.waitFor(() => {
			expect(button?.textContent).toBe('favorite');
		});
	});

	it('should toggle button text from "favorite" to "un-favorite" after successful favorite', async () => {
		mockOjContext.favorites = new Map();

		// Mock getPageDom to return auth token
		vi.spyOn(dom, 'getPageDom').mockResolvedValue({
			querySelector: vi.fn().mockReturnValue({
				href: 'https://news.ycombinator.com/fave?id=46671233&auth=test-auth-token',
			}),
		} as any);

		// Mock successful API response with 302 redirect
		global.fetch = vi.fn().mockResolvedValue({
			ok: false, // This is the bug - response.ok is false for 302
			status: 302,
			statusText: 'Found',
		});

		initFavorites(document, mockOjContext);

		const buttons = document.querySelectorAll('.oj-link-button');
		const button = buttons[0] as HTMLButtonElement;

		expect(button?.textContent).toBe('favorite');

		// Click to favorite
		button.click();

		await vi.waitFor(() => {
			// Bug: text should update to "un-favorite" but might not due to the code logic
			expect(button?.textContent).toBe('un-favorite');
		});
	});

	it('should handle fetch failure when response is not 302', async () => {
		// Mock failed API response
		global.fetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 500,
			statusText: 'Internal Server Error',
		});

		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		initFavorites(document, mockOjContext);

		const buttons = document.querySelectorAll('.oj-link-button');
		const button = buttons[0] as HTMLButtonElement;

		button.click();

		await vi.waitFor(() => {
			expect(consoleErrorSpy).toHaveBeenCalled();
			expect(button?.textContent).toBe('un-favorite'); // Should not change on error
		});
	});

	it('should clean up event listeners when cleanup function is called', () => {
		const cleanup = initFavorites(document, mockOjContext);

		const buttons = document.querySelectorAll('.oj-link-button');
		const button = buttons[0] as HTMLButtonElement;

		const removeEventListenerSpy = vi.spyOn(button, 'removeEventListener');

		cleanup();

		expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
	});

	it('should call saved.removeFromStorage when unfavoriting', async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 302,
			statusText: 'Found',
		});

		const removeFromStorageSpy = vi
			.spyOn(saved, 'removeFromStorage')
			.mockImplementation(() => {});

		initFavorites(document, mockOjContext);

		const buttons = document.querySelectorAll('.oj-link-button');
		const button = buttons[0] as HTMLButtonElement;

		button.click();

		await vi.waitFor(() => {
			expect(removeFromStorageSpy).toHaveBeenCalledWith('46671233');
		});
	});

	it('should make correct API call to unfavorite', async () => {
		const fetchSpy = vi.fn().mockResolvedValue({
			ok: false,
			status: 302,
			statusText: 'Found',
		});
		global.fetch = fetchSpy;

		vi.spyOn(saved, 'removeFromStorage').mockImplementation(() => {});

		initFavorites(document, mockOjContext);

		const buttons = document.querySelectorAll('.oj-link-button');
		const button = buttons[0] as HTMLButtonElement;

		button.click();

		await vi.waitFor(() => {
			expect(fetchSpy).toHaveBeenCalledWith(
				'https://news.ycombinator.com/fave?id=46671233&un=t&auth=test-auth-token-1',
				{
					method: 'GET',
					credentials: 'include',
					redirect: 'manual',
				}
			);
		});
	});

	it('should make correct API call to favorite', async () => {
		mockOjContext.favorites = new Map();

		vi.spyOn(dom, 'getPageDom').mockResolvedValue({
			querySelector: vi.fn().mockReturnValue({
				href: 'https://news.ycombinator.com/fave?id=46671233&auth=new-auth-token',
			}),
		} as any);

		const fetchSpy = vi.fn().mockResolvedValue({
			ok: false,
			status: 302,
			statusText: 'Found',
		});
		global.fetch = fetchSpy;

		initFavorites(document, mockOjContext);

		const buttons = document.querySelectorAll('.oj-link-button');
		const button = buttons[0] as HTMLButtonElement;

		button.click();

		await vi.waitFor(() => {
			expect(fetchSpy).toHaveBeenCalledWith(
				'https://news.ycombinator.com/fave?id=46671233&auth=new-auth-token',
				{
					method: 'GET',
					credentials: 'include',
					redirect: 'manual',
				}
			);
		});
	});
});

describe('initFavorites with .subline (frontpage posts)', () => {
	let mockOjContext: OJContext;
	let mockFavorites: Map<string, SavedItem>;

	beforeEach(() => {
		document.body.innerHTML = frontpageFixtureHtml;
		Object.defineProperty(window, 'location', {
			value: { pathname: '/' },
			writable: true,
		});

		mockFavorites = new Map([
			[
				'12345678',
				{
					id: '12345678',
					auth: 'test-auth-token-1',
					type: SavedItemType.FavoriteComments,
				},
			],
		]);

		mockOjContext = {
			user: {
				username: 'testuser',
			},
			favorites: mockFavorites,
		};

		vi.clearAllMocks();
	});

	it('should add favorite/un-favorite buttons to frontpage posts', () => {
		initFavorites(document, mockOjContext);

		const buttons = document.querySelectorAll('.oj-link-button');
		expect(buttons.length).toBe(2);
	});

	it('should display "un-favorite" for already favorited frontpage posts', () => {
		initFavorites(document, mockOjContext);

		const buttons = document.querySelectorAll('.oj-link-button');
		const firstButton = buttons[0] as HTMLButtonElement;

		expect(firstButton?.textContent).toBe('un-favorite');
	});

	it('should display "favorite" for non-favorited frontpage posts', () => {
		initFavorites(document, mockOjContext);

		const buttons = document.querySelectorAll('.oj-link-button');
		const secondButton = buttons[1] as HTMLButtonElement;

		expect(secondButton?.textContent).toBe('favorite');
	});

	it('should toggle frontpage post from "favorite" to "un-favorite"', async () => {
		vi.spyOn(dom, 'getPageDom').mockResolvedValue({
			querySelector: vi.fn().mockReturnValue({
				href: 'https://news.ycombinator.com/fave?id=87654321&auth=new-auth-token',
			}),
		} as any);

		global.fetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 302,
			statusText: 'Found',
		});

		initFavorites(document, mockOjContext);

		const buttons = document.querySelectorAll('.oj-link-button');
		const button = buttons[1] as HTMLButtonElement;

		expect(button?.textContent).toBe('favorite');

		button.click();

		await vi.waitFor(() => {
			expect(button?.textContent).toBe('un-favorite');
		});
	});

	it('should make correct API call for frontpage post favorite', async () => {
		vi.spyOn(dom, 'getPageDom').mockResolvedValue({
			querySelector: vi.fn().mockReturnValue({
				href: 'https://news.ycombinator.com/fave?id=87654321&auth=frontpage-auth-token',
			}),
		} as any);

		const fetchSpy = vi.fn().mockResolvedValue({
			ok: false,
			status: 302,
			statusText: 'Found',
		});
		global.fetch = fetchSpy;

		initFavorites(document, mockOjContext);

		const buttons = document.querySelectorAll('.oj-link-button');
		const button = buttons[1] as HTMLButtonElement;

		button.click();

		await vi.waitFor(() => {
			expect(fetchSpy).toHaveBeenCalledWith(
				'https://news.ycombinator.com/fave?id=87654321&auth=frontpage-auth-token',
				{
					method: 'GET',
					credentials: 'include',
					redirect: 'manual',
				}
			);
		});
	});
});
