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

	describe('elementPosition', () => {
		it('should calculate element position relative to body', () => {
			document.body.innerHTML = '<div id="test"></div>';
			const element = document.querySelector<HTMLElement>('#test');

			if (!element) {
				throw new Error('Element not found');
			}

			element.getBoundingClientRect = vi.fn(() => ({
				top: 250,
				left: 100,
				right: 300,
				bottom: 350,
				width: 200,
				height: 100,
				x: 100,
				y: 250,
				// biome-ignore lint/suspicious/noEmptyBlockStatements: tests
				toJSON: () => {},
			}));

			document.body.getBoundingClientRect = vi.fn(() => ({
				top: 50,
				left: 0,
				right: 1000,
				bottom: 1000,
				width: 1000,
				height: 950,
				x: 0,
				y: 50,
				// biome-ignore lint/suspicious/noEmptyBlockStatements: tests
				toJSON: () => {},
			}));

			const position = dom.elementPosition(document, element);

			expect(position).toEqual({ x: 100, y: 200 });
		});

		it('should handle elements at the top of the page', () => {
			document.body.innerHTML = '<div id="test"></div>';
			const element = document.querySelector<HTMLElement>('#test');

			if (!element) {
				throw new Error('Element not found');
			}

			element.getBoundingClientRect = vi.fn(() => ({
				top: 0,
				left: 50,
				right: 150,
				bottom: 100,
				width: 100,
				height: 100,
				x: 50,
				y: 0,
				// biome-ignore lint/suspicious/noEmptyBlockStatements: tests
				toJSON: () => {},
			}));

			document.body.getBoundingClientRect = vi.fn(() => ({
				top: 0,
				left: 0,
				right: 1000,
				bottom: 1000,
				width: 1000,
				height: 1000,
				x: 0,
				y: 0,
				// biome-ignore lint/suspicious/noEmptyBlockStatements: tests
				toJSON: () => {},
			}));

			const position = dom.elementPosition(document, element);

			expect(position).toEqual({ x: 50, y: 0 });
		});
	});

	describe('elementInScrollView', () => {
		it('should return true when element is fully visible in viewport', () => {
			document.body.innerHTML = '<div id="test"></div>';
			const element = document.querySelector<HTMLElement>('#test');
			if (!element) {
				throw new Error('Element not found');
			}

			element.getBoundingClientRect = vi.fn(() => ({
				top: 100,
				left: 0,
				right: 200,
				bottom: 300,
				width: 200,
				height: 200,
				x: 0,
				y: 100,
				// biome-ignore lint/suspicious/noEmptyBlockStatements: tests
				toJSON: () => {},
			}));

			Object.defineProperty(window, 'innerHeight', {
				writable: true,
				configurable: true,
				value: 800,
			});

			const result = dom.elementInScrollView(element);

			expect(result).toBe(true);
		});

		it('should return false when element is above viewport', () => {
			document.body.innerHTML = '<div id="test"></div>';
			const element = document.querySelector<HTMLElement>('#test');
			if (!element) {
				throw new Error('Element not found');
			}

			element.getBoundingClientRect = vi.fn(() => ({
				top: -100,
				left: 0,
				right: 200,
				bottom: -10,
				width: 200,
				height: 90,
				x: 0,
				y: -100,
				// biome-ignore lint/suspicious/noEmptyBlockStatements: tests
				toJSON: () => {},
			}));

			Object.defineProperty(window, 'innerHeight', {
				writable: true,
				configurable: true,
				value: 800,
			});

			const result = dom.elementInScrollView(element);

			expect(result).toBe(false);
		});

		it('should return false when element is below viewport', () => {
			document.body.innerHTML = '<div id="test"></div>';
			const element = document.querySelector<HTMLElement>('#test');
			if (!element) {
				throw new Error('Element not found');
			}

			element.getBoundingClientRect = vi.fn(() => ({
				top: 900,
				left: 0,
				right: 200,
				bottom: 1100,
				width: 200,
				height: 200,
				x: 0,
				y: 900,
				// biome-ignore lint/suspicious/noEmptyBlockStatements: tests
				toJSON: () => {},
			}));

			Object.defineProperty(window, 'innerHeight', {
				writable: true,
				configurable: true,
				value: 800,
			});

			const result = dom.elementInScrollView(element);

			expect(result).toBe(false);
		});

		it('should return true when element is at the top edge of viewport', () => {
			document.body.innerHTML = '<div id="test"></div>';
			const element = document.querySelector<HTMLElement>('#test');
			if (!element) {
				throw new Error('Element not found');
			}

			element.getBoundingClientRect = vi.fn(() => ({
				top: 0,
				left: 0,
				right: 200,
				bottom: 100,
				width: 200,
				height: 100,
				x: 0,
				y: 0,
				// biome-ignore lint/suspicious/noEmptyBlockStatements: tests
				toJSON: () => {},
			}));

			Object.defineProperty(window, 'innerHeight', {
				writable: true,
				configurable: true,
				value: 800,
			});

			const result = dom.elementInScrollView(element);

			expect(result).toBe(true);
		});

		it('should return true when element bottom is at the bottom edge of viewport', () => {
			document.body.innerHTML = '<div id="test"></div>';
			const element = document.querySelector<HTMLElement>('#test');
			if (!element) {
				throw new Error('Element not found');
			}

			element.getBoundingClientRect = vi.fn(() => ({
				top: 600,
				left: 0,
				right: 200,
				bottom: 800,
				width: 200,
				height: 200,
				x: 0,
				y: 600,
				// biome-ignore lint/suspicious/noEmptyBlockStatements: tests
				toJSON: () => {},
			}));

			Object.defineProperty(window, 'innerHeight', {
				writable: true,
				configurable: true,
				value: 800,
			});

			const result = dom.elementInScrollView(element);

			expect(result).toBe(true);
		});

		it('should return false when element is partially cut off at bottom', () => {
			document.body.innerHTML = '<div id="test"></div>';
			const element = document.querySelector<HTMLElement>('#test');
			if (!element) {
				throw new Error('Element not found');
			}

			element.getBoundingClientRect = vi.fn(() => ({
				top: 700,
				left: 0,
				right: 200,
				bottom: 900,
				width: 200,
				height: 200,
				x: 0,
				y: 700,
				// biome-ignore lint/suspicious/noEmptyBlockStatements: tests
				toJSON: () => {},
			}));

			Object.defineProperty(window, 'innerHeight', {
				writable: true,
				configurable: true,
				value: 800,
			});

			const result = dom.elementInScrollView(element);

			expect(result).toBe(false);
		});
	});

	describe('getCommentIndentation', () => {
		it('should return indentation level based on image width', () => {
			const comment = document.createElement('div');
			comment.innerHTML = '<div class="ind"><img width="80" /></div>';

			const { element, width } = dom.getCommentIndentation(comment);

			expect(element).toBeDefined();
			expect(width).toBe(2);
		});

		it('should return indentation of 0 for root comments', () => {
			const comment = document.createElement('div');
			comment.innerHTML = '<div class="ind"><img width="0" /></div>';

			const { element, width } = dom.getCommentIndentation(comment);

			expect(element).toBeDefined();
			expect(width).toBe(0);
		});

		it('should return undefined when no indentation image exists', () => {
			const comment = document.createElement('div');
			comment.innerHTML = '<div class="ind"></div>';

			const { element, width } = dom.getCommentIndentation(comment);

			expect(element).toBeUndefined();
			expect(width).toBeUndefined();
		});
	});

	describe('isComboKey', () => {
		it('should return true when ctrl key is pressed', () => {
			const event = new KeyboardEvent('keydown', { ctrlKey: true });

			const result = dom.isComboKey(event);

			expect(result).toBe(true);
		});

		it('should return true when meta key is pressed', () => {
			const event = new KeyboardEvent('keydown', { metaKey: true });

			const result = dom.isComboKey(event);

			expect(result).toBe(true);
		});

		it('should return true when shift key is pressed', () => {
			const event = new KeyboardEvent('keydown', { shiftKey: true });

			const result = dom.isComboKey(event);

			expect(result).toBe(true);
		});

		it('should return true when alt key is pressed', () => {
			const event = new KeyboardEvent('keydown', { altKey: true });

			const result = dom.isComboKey(event);

			expect(result).toBe(true);
		});

		it('should return false when no modifier keys are pressed', () => {
			const event = new KeyboardEvent('keydown', {
				ctrlKey: false,
				metaKey: false,
				shiftKey: false,
				altKey: false,
			});

			const result = dom.isComboKey(event);

			expect(result).toBe(false);
		});

		it('should return true when multiple modifier keys are pressed', () => {
			const event = new KeyboardEvent('keydown', { ctrlKey: true, shiftKey: true });

			const result = dom.isComboKey(event);

			expect(result).toBe(true);
		});
	});
});
