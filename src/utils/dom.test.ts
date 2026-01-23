import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { dom } from './dom.ts';

const loggedInHtml = readFileSync(join(__dirname, '__fixtures__', 'hn-logged-in.html'), 'utf-8');
const loggedOutHtml = readFileSync(join(__dirname, '__fixtures__', 'hn-logged-out.html'), 'utf-8');

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

		expect(fetchSpy).toHaveBeenCalledWith('https://example.com/page', { cache: 'force-cache' });
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

		expect(fetchSpy).toHaveBeenCalledWith('https://news.ycombinator.com/item?id=123', { cache: 'force-cache' });
		fetchSpy.mockRestore();
	});
});
