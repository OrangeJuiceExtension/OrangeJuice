import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContentScriptContext } from '#imports';
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

			const overlay = createModal({ content, ctx, doc });

			expect(overlay).toBeDefined();
			expect(overlay.querySelector('p')?.textContent).toBe('<p>Test content</p>');
		});

		it('should create modal with HTML element content', () => {
			const content = doc.createElement('div');
			content.textContent = 'Test element';

			const overlay = createModal({ content, ctx, doc });

			expect(overlay).toBeDefined();
			expect(overlay.querySelector('div')?.textContent).toBe('Test element');
		});

		it('should have overlay with correct styles', () => {
			const overlay = createModal({ content: 'test', ctx, doc });

			expect(overlay.style.position).toBe('fixed');
			expect(overlay.style.zIndex).toBe('10000');
		});

		it('should have modal with HN colors', () => {
			const overlay = createModal({ content: 'test', ctx, doc });
			const modal = overlay.firstChild as HTMLElement;

			expect(modal.style.backgroundColor).toBe('#f6f6ef');
			expect(modal.style.border).toBe('3px solid #ff6600');
		});
	});

	describe('showModal', () => {
		it('should append modal to document body', () => {
			showModal({ content: 'test', ctx, doc });

			const overlay = doc.body.querySelector('div');
			expect(overlay).toBeDefined();
		});
	});

	describe('closing modal', () => {
		it('should remove modal when clicking overlay', () => {
			const overlay = createModal({ content: 'test', ctx, doc });
			doc.body.appendChild(overlay);

			const clickEvent = new MouseEvent('click', { bubbles: true });
			Object.defineProperty(clickEvent, 'target', {
				enumerable: true,
				value: overlay,
			});
			overlay.dispatchEvent(clickEvent);

			expect(doc.body.contains(overlay)).toBe(false);
		});

		it('should not remove modal when clicking modal content', () => {
			const overlay = createModal({ content: 'test', ctx, doc });
			doc.body.appendChild(overlay);
			const modal = overlay.firstChild as HTMLElement;

			const clickEvent = new MouseEvent('click', { bubbles: true });
			Object.defineProperty(clickEvent, 'target', {
				enumerable: true,
				value: modal,
			});
			modal.dispatchEvent(clickEvent);

			expect(doc.body.contains(overlay)).toBe(true);
		});

		it('should remove modal on Escape key', () => {
			const overlay = createModal({ content: 'test', ctx, doc });
			doc.body.appendChild(overlay);

			const escapeEvent = new KeyboardEvent('keydown', {
				bubbles: true,
				key: 'Escape',
			});
			doc.dispatchEvent(escapeEvent);

			expect(doc.body.contains(overlay)).toBe(false);
		});

		it('should remove modal on escape key', () => {
			const overlay = createModal({ content: 'test', ctx, doc });
			doc.body.appendChild(overlay);

			const escapeEvent = new KeyboardEvent('keydown', {
				bubbles: true,
				key: 'escape',
			});
			doc.dispatchEvent(escapeEvent);

			expect(doc.body.contains(overlay)).toBe(false);
		});

		it('should remove modal on context invalidation', () => {
			const overlay = createModal({ content: 'test', ctx, doc });
			doc.body.appendChild(overlay);

			invalidateCallback();

			expect(doc.body.contains(overlay)).toBe(false);
		});

		it('should clean up event listeners on invalidation', () => {
			const removeSpy = vi.spyOn(doc, 'removeEventListener');
			createModal({ content: 'test', ctx, doc });

			invalidateCallback();

			expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
		});
	});
});
