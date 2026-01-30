import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import { createModal, showModal } from './modal';

const noop = () => {
	/* intentionally empty */
};

describe('modal', () => {
	let doc: Document;
	let ctx: ContentScriptContext;
	let invalidateCallback: () => void;

	beforeEach(() => {
		doc = document.implementation.createHTMLDocument();
		invalidateCallback = noop;
		ctx = {
			onInvalidated: vi.fn((cb) => {
				invalidateCallback = cb;
			}),
		} as unknown as ContentScriptContext;
	});

	describe('createModal', () => {
		it('should create modal with string content', () => {
			const content = '<p>Test content</p>';

			const overlay = createModal({ doc, ctx, content });

			expect(overlay).toBeDefined();
			expect(overlay.querySelector('p')?.textContent).toBe('Test content');
		});

		it('should create modal with HTML element content', () => {
			const content = doc.createElement('div');
			content.textContent = 'Test element';

			const overlay = createModal({ doc, ctx, content });

			expect(overlay).toBeDefined();
			expect(overlay.querySelector('div')?.textContent).toBe('Test element');
		});

		it('should have overlay with correct styles', () => {
			const overlay = createModal({ doc, ctx, content: 'test' });

			expect(overlay.style.position).toBe('fixed');
			expect(overlay.style.zIndex).toBe('10000');
		});

		it('should have modal with HN colors', () => {
			const overlay = createModal({ doc, ctx, content: 'test' });
			const modal = overlay.firstChild as HTMLElement;

			expect(modal.style.backgroundColor).toBe('#f6f6ef');
			expect(modal.style.border).toBe('3px solid #ff6600');
		});
	});

	describe('showModal', () => {
		it('should append modal to document body', () => {
			showModal({ doc, ctx, content: 'test' });

			const overlay = doc.body.querySelector('div');
			expect(overlay).toBeDefined();
		});
	});

	describe('closing modal', () => {
		it('should remove modal when clicking overlay', () => {
			const overlay = createModal({ doc, ctx, content: 'test' });
			doc.body.appendChild(overlay);

			const clickEvent = new MouseEvent('click', { bubbles: true });
			Object.defineProperty(clickEvent, 'target', {
				value: overlay,
				enumerable: true,
			});
			overlay.dispatchEvent(clickEvent);

			expect(doc.body.contains(overlay)).toBe(false);
		});

		it('should not remove modal when clicking modal content', () => {
			const overlay = createModal({ doc, ctx, content: 'test' });
			doc.body.appendChild(overlay);
			const modal = overlay.firstChild as HTMLElement;

			const clickEvent = new MouseEvent('click', { bubbles: true });
			Object.defineProperty(clickEvent, 'target', {
				value: modal,
				enumerable: true,
			});
			modal.dispatchEvent(clickEvent);

			expect(doc.body.contains(overlay)).toBe(true);
		});

		it('should remove modal on Escape key', () => {
			const overlay = createModal({ doc, ctx, content: 'test' });
			doc.body.appendChild(overlay);

			const escapeEvent = new KeyboardEvent('keydown', {
				key: 'Escape',
				bubbles: true,
			});
			window.dispatchEvent(escapeEvent);

			expect(doc.body.contains(overlay)).toBe(false);
		});

		it('should remove modal on escape key', () => {
			const overlay = createModal({ doc, ctx, content: 'test' });
			doc.body.appendChild(overlay);

			const escapeEvent = new KeyboardEvent('keydown', {
				key: 'escape',
				bubbles: true,
			});
			window.dispatchEvent(escapeEvent);

			expect(doc.body.contains(overlay)).toBe(false);
		});

		it('should remove modal on context invalidation', () => {
			const overlay = createModal({ doc, ctx, content: 'test' });
			doc.body.appendChild(overlay);

			invalidateCallback();

			expect(doc.body.contains(overlay)).toBe(false);
		});

		it('should clean up event listeners on invalidation', () => {
			const removeSpy = vi.spyOn(window, 'removeEventListener');
			createModal({ doc, ctx, content: 'test' });

			invalidateCallback();

			expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
		});
	});
});
