import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { dom } from './dom.ts';

const loggedInHtml = readFileSync(join(__dirname, '__fixtures__', 'hn-logged-in.html'), 'utf-8');
const loggedOutHtml = readFileSync(join(__dirname, '__fixtures__', 'hn-logged-out.html'), 'utf-8');

describe('dom', () => {
	describe('getUsername', () => {
		it('should return username when logged in', () => {
			document.body.innerHTML = loggedInHtml;

			const username = dom.getUsername(document);

			expect(username).toBe('testuser');
		});

		it('should return undefined when logged out', () => {
			document.body.innerHTML = loggedOutHtml;

			const username = dom.getUsername(document);

			expect(username).toBeUndefined();
		});

		it('should return undefined when pagetop is missing', () => {
			document.body.innerHTML = '<div>No pagetop here</div>';

			const username = dom.getUsername(document);

			expect(username).toBeUndefined();
		});
	});

	describe('getPageDom', () => {
		it('should return undefined when offline', async () => {
			const originalOnLine = navigator.onLine;
			Object.defineProperty(navigator, 'onLine', {
				writable: true,
				value: false,
			});

			const result = await dom.getPageDom('https://example.com');

			expect(result).toBeUndefined();

			Object.defineProperty(navigator, 'onLine', {
				writable: true,
				value: originalOnLine,
			});
		});

		it('should not prepend base path for URLs starting with http', async () => {
			const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
				text: async () => '<div>test</div>',
			} as Response);

			await dom.getPageDom('https://example.com/page');

			expect(fetchSpy).toHaveBeenCalledWith('https://example.com/page', {
				cache: 'force-cache',
			});
			fetchSpy.mockRestore();
		});

		it('should not prepend base path for URLs starting with /', async () => {
			const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
				text: async () => '<div>test</div>',
			} as Response);

			await dom.getPageDom('/item?id=123');

			expect(fetchSpy).toHaveBeenCalledWith('/item?id=123', { cache: 'force-cache' });
			fetchSpy.mockRestore();
		});

		it('should prepend base path for relative URLs', async () => {
			const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
				text: async () => '<div>test</div>',
			} as Response);

			await dom.getPageDom('item?id=123');

			expect(fetchSpy).toHaveBeenCalledWith('https://news.ycombinator.com/item?id=123', {
				cache: 'force-cache',
			});
			fetchSpy.mockRestore();
		});
	});

	describe('createOptions', () => {
		it('should create option elements with positive step', () => {
			const result = dom.createOptions(1, 3, 1, 2);
			expect(result).toHaveLength(3);
			expect(result[0].textContent).toBe('01');
			expect(result[0].value).toBe('1');
			expect(result[0].selected).toBe(false);
			expect(result[1].textContent).toBe('02');
			expect(result[1].value).toBe('2');
			expect(result[1].selected).toBe(true);
			expect(result[2].textContent).toBe('03');
			expect(result[2].value).toBe('3');
			expect(result[2].selected).toBe(false);
		});

		it('should create option elements with negative step', () => {
			const result = dom.createOptions(2026, 2024, -1, 2025);
			expect(result).toHaveLength(3);
			expect(result[0].value).toBe('2026');
			expect(result[1].value).toBe('2025');
			expect(result[1].selected).toBe(true);
			expect(result[2].value).toBe('2024');
		});

		it('should pad values with zeros', () => {
			const result = dom.createOptions(1, 12, 1, 5);
			expect(result[0].value).toBe('1');
			expect(result[4].value).toBe('5');
			expect(result[4].selected).toBe(true);
		});

		it('should not pad values with 4 digits', () => {
			const result = dom.createOptions(2024, 2024, 1, 2024);
			expect(result[0].value).toBe('2024');
			expect(result[0].selected).toBe(true);
		});
	});
});
