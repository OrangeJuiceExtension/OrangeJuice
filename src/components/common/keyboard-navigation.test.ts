import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContentScriptContext } from '#imports';
import { KEYBOARD_COMMANDS_STORAGE_KEY } from '@/components/common/keyboard-commands.ts';
import lStorage from '@/utils/local-storage.ts';
import { keyboardNavigation } from './keyboard-navigation';

const noop = () => {
	/* intentionally empty */
};

describe('keyboardNavigation', () => {
	let doc: Document;
	let ctx: ContentScriptContext;
	let invalidateCallback: () => void;
	let locationHref: string;

	beforeEach(async () => {
		await lStorage.setItem(KEYBOARD_COMMANDS_STORAGE_KEY, null);
		doc = document.implementation.createHTMLDocument();
		invalidateCallback = noop;
		ctx = {
			onInvalidated: vi.fn((cb) => {
				invalidateCallback = cb;
			}),
		} as unknown as ContentScriptContext;

		// Mock window.location with a fresh object for each test
		locationHref = 'https://news.ycombinator.com';
		Object.defineProperty(window, 'location', {
			configurable: true,
			value: {
				get href() {
					return locationHref;
				},
				set href(val: string) {
					locationHref = val;
				},
			},
			writable: true,
		});
	});

	describe('help modal', () => {
		it('should open help modal on ? key', async () => {
			const bodyChildCount = doc.body.children.length;
			await keyboardNavigation(ctx, doc);

			const event = new KeyboardEvent('keydown', {
				key: '?',
				shiftKey: true,
			});
			doc.dispatchEvent(event);

			await vi.waitFor(() => {
				expect(doc.body.children.length).toBeGreaterThan(bodyChildCount);
			});
		});

		it('should not open help modal without shift key', async () => {
			const bodyChildCount = doc.body.children.length;
			await keyboardNavigation(ctx, doc);

			const event = new KeyboardEvent('keydown', {
				key: '?',
				shiftKey: false,
			});
			doc.dispatchEvent(event);

			expect(doc.body.children.length).toBe(bodyChildCount);
		});
	});

	describe('navigation shortcuts', () => {
		it('should navigate to home on Ó key (Alt+H)', async () => {
			await keyboardNavigation(ctx, doc);

			const event = new KeyboardEvent('keydown', { key: 'Ó' });
			doc.dispatchEvent(event);

			expect(window.location.href).toBe('https://news.ycombinator.com');
		});

		it('should navigate to submit on Í key (Alt+S)', async () => {
			await keyboardNavigation(ctx, doc);

			const event = new KeyboardEvent('keydown', { key: 'Í' });
			doc.dispatchEvent(event);

			expect(window.location.href).toBe('https://news.ycombinator.com/submit');
		});

		it('should navigate to show on Ø key (Alt+O)', async () => {
			await keyboardNavigation(ctx, doc);

			const event = new KeyboardEvent('keydown', { key: 'Ø' });
			doc.dispatchEvent(event);

			expect(window.location.href).toBe('https://news.ycombinator.com/show');
		});

		it('should navigate to ask on Å key (Alt+A)', async () => {
			await keyboardNavigation(ctx, doc);

			const event = new KeyboardEvent('keydown', { key: 'Å' });
			doc.dispatchEvent(event);

			expect(window.location.href).toBe('https://news.ycombinator.com/ask');
		});

		it('should navigate to newest on ˜ key (Alt+N)', async () => {
			await keyboardNavigation(ctx, doc);

			const event = new KeyboardEvent('keydown', { key: '˜' });
			doc.dispatchEvent(event);

			expect(window.location.href).toBe('https://news.ycombinator.com/newest');
		});

		it('should navigate to profile on ∏ key (Alt+P) when username provided', async () => {
			await keyboardNavigation(ctx, doc, 'testuser');

			const event = new KeyboardEvent('keydown', { key: '∏' });
			doc.dispatchEvent(event);

			expect(window.location.href).toBe('https://news.ycombinator.com/user?id=testuser');
		});

		it('should not navigate to profile on ∏ key (Alt+P) without username', async () => {
			const originalHref = window.location.href;
			await keyboardNavigation(ctx, doc, undefined);

			const event = new KeyboardEvent('keydown', { key: '∏' });
			doc.dispatchEvent(event);

			expect(window.location.href).toBe(originalHref);
		});

		it('should navigate to threads on ˇ key (Alt+T) when username provided', async () => {
			await keyboardNavigation(ctx, doc, 'testuser');

			const event = new KeyboardEvent('keydown', { key: 'ˇ' });
			doc.dispatchEvent(event);

			expect(window.location.href).toBe('https://news.ycombinator.com/threads?id=testuser');
		});

		it('should not navigate to threads on ˇ key (Alt+T) without username', async () => {
			const originalHref = window.location.href;
			await keyboardNavigation(ctx, doc);

			const event = new KeyboardEvent('keydown', { key: 'ˇ' });
			doc.dispatchEvent(event);

			expect(window.location.href).toBe(originalHref);
		});
	});

	describe('cleanup', () => {
		it('should remove event listeners on context invalidation', async () => {
			const removeSpy = vi.spyOn(doc, 'removeEventListener');
			await keyboardNavigation(ctx, doc);

			invalidateCallback();

			expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
			expect(removeSpy).toHaveBeenCalledTimes(1);
		});
	});
});
