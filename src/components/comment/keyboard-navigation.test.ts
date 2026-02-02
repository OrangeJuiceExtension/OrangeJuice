/** biome-ignore-all lint/performance/noDelete: tests */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContentScriptContext } from '#imports';
import { keyboardNavigation } from '@/components/comment/keyboard-navigation.ts';
import { itemKeyboardHandlers } from '@/utils/item-keyboard-handlers.ts';

const noop = () => {
	/* intentionally empty */
};

describe('keyboardNavigation', () => {
	let doc: Document;
	let comments: HTMLElement[];
	let ctx: ContentScriptContext;
	let invalidateCallback: () => void;

	const createComments = (count: number): HTMLElement[] => {
		const elements: HTMLElement[] = [];
		for (let i = 1; i <= count; i++) {
			const tr = doc.createElement('tr');
			tr.id = `item-${i}`;
			tr.classList.add('comtr');
			elements.push(tr);
		}
		return elements;
	};

	const dispatchKeydown = (key: string, options: Partial<KeyboardEvent> = {}) => {
		const event = new KeyboardEvent('keydown', {
			key,
			bubbles: true,
			...options,
		});
		doc.dispatchEvent(event);
		return event;
	};

	beforeEach(() => {
		vi.clearAllMocks();
		doc = document.implementation.createHTMLDocument();
		comments = createComments(3);
		invalidateCallback = noop;
		ctx = {
			onInvalidated: vi.fn((cb) => {
				invalidateCallback = cb;
			}),
		} as unknown as ContentScriptContext;
		vi.spyOn(doc.body, 'scrollTo').mockImplementation(noop);
		vi.spyOn(itemKeyboardHandlers, 'move');
		vi.spyOn(itemKeyboardHandlers, 'escape');
		vi.spyOn(itemKeyboardHandlers, 'reply');
		vi.spyOn(itemKeyboardHandlers, 'favorite');
		vi.spyOn(itemKeyboardHandlers, 'flag');
		vi.spyOn(itemKeyboardHandlers, 'next');
		vi.spyOn(itemKeyboardHandlers, 'previous');
		vi.spyOn(itemKeyboardHandlers, 'upvote');
		vi.spyOn(itemKeyboardHandlers, 'downvote');
		vi.spyOn(itemKeyboardHandlers, 'collapseToggle');
		vi.spyOn(itemKeyboardHandlers, 'openReferenceLink');
		vi.spyOn(itemKeyboardHandlers, 'activate');
	});

	afterEach(() => {
		// Clean up event listeners registered by keyboardNavigation
		invalidateCallback();
	});

	describe('initialization', () => {
		it('should inject focus styles into document head', () => {
			keyboardNavigation(ctx, doc, comments);

			const styleElement = doc.head.querySelector('style');
			expect(styleElement).toBeDefined();
			expect(styleElement?.textContent).toContain('.oj_focused_item .default');
			expect(styleElement?.textContent).toContain('outline: 3px solid #f7694c73');
		});

		it('should register onInvalidated callback', () => {
			keyboardNavigation(ctx, doc, comments);

			expect(ctx.onInvalidated).toHaveBeenCalledWith(expect.any(Function));
		});
	});

	describe('keyboard shortcuts', () => {
		const keyHandlerTests = [
			{
				name: 'j should move down',
				key: 'j',
				handler: 'move',
			},
			{
				name: 'J should move down',
				key: 'J',
				handler: 'move',
			},
			{
				name: 'k should move up',
				key: 'k',
				handler: 'move',
			},
			{
				name: 'K should move up',
				key: 'K',
				handler: 'move',
			},
			{
				name: 'n should call next',
				key: 'n',
				handler: 'next',
			},
			{
				name: 'p should call previous',
				key: 'p',
				handler: 'previous',
			},
			{
				name: 'u should call upvote',
				key: 'u',
				handler: 'upvote',
			},
			{
				name: 'd should call downvote',
				key: 'd',
				handler: 'downvote',
			},
			{
				name: 'r should call reply',
				key: 'r',
				handler: 'reply',
			},
			{
				name: 'f should call favorite',
				key: 'f',
				handler: 'favorite',
			},
			{
				name: 'X should call flag',
				key: 'X',
				handler: 'flag',
			},
		];

		describe('handlers should be called', () => {
			for (const { name, key, handler } of keyHandlerTests) {
				it(name, () => {
					keyboardNavigation(ctx, doc, comments);
					const comment = comments[0];
					if (comment) {
						comment.click();
					}
					// Hold shift for uppercase keys to match real keyboard behavior
					const isUppercase = key === key.toUpperCase() && key !== key.toLowerCase();
					dispatchKeydown(key, isUppercase ? { shiftKey: true } : {});

					expect(
						itemKeyboardHandlers[handler as keyof typeof itemKeyboardHandlers]
					).toHaveBeenCalled();
				});
			}
		});

		it('Escape should call escape handler', () => {
			keyboardNavigation(ctx, doc, comments);
			dispatchKeydown('Escape');

			expect(itemKeyboardHandlers.escape).toHaveBeenCalled();
		});

		it('escape should call escape handler', () => {
			keyboardNavigation(ctx, doc, comments);
			dispatchKeydown('escape');

			expect(itemKeyboardHandlers.escape).toHaveBeenCalled();
		});

		it('c should call collapseToggle', () => {
			keyboardNavigation(ctx, doc, comments);
			const comment = comments[0];
			if (comment) {
				comment.click();
			}
			dispatchKeydown('c');

			expect(itemKeyboardHandlers.collapseToggle).toHaveBeenCalled();
		});

		it('t should scroll to top', () => {
			keyboardNavigation(ctx, doc, comments);
			dispatchKeydown('t');

			expect(doc.body.scrollTo).toHaveBeenCalledWith(0, 0);
		});

		describe('number keys', () => {
			const numbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

			for (const num of numbers) {
				it(`${num} should call openReferenceLink`, () => {
					keyboardNavigation(ctx, doc, comments);
					const comment = comments[0];
					if (comment) {
						comment.click();
					}
					dispatchKeydown(num);

					expect(itemKeyboardHandlers.openReferenceLink).toHaveBeenCalled();
				});
			}
		});
	});

	describe('escape with reply open', () => {
		it('should click reply button when reply is stored', () => {
			keyboardNavigation(ctx, doc, comments);
			const comment = comments[0];
			if (comment) {
				comment.click();
			}

			const replyBtn = doc.createElement('a');
			replyBtn.href = 'reply?id=123';
			const clickSpy = vi.spyOn(replyBtn, 'click');
			vi.mocked(itemKeyboardHandlers.reply).mockReturnValueOnce(replyBtn);

			dispatchKeydown('r');
			dispatchKeydown('Escape');

			expect(clickSpy).toHaveBeenCalledTimes(1);
		});

		it('should clear reply after clicking', () => {
			keyboardNavigation(ctx, doc, comments);
			const replyBtn = document.createElement('a');
			replyBtn.href = 'reply?id=123';
			vi.spyOn(replyBtn, 'click');
			vi.mocked(itemKeyboardHandlers.reply).mockReturnValue(replyBtn);

			dispatchKeydown('r');
			dispatchKeydown('Escape');
			dispatchKeydown('Escape');

			expect(itemKeyboardHandlers.escape).toHaveBeenCalled();
		});
	});

	describe('handlers requiring active item', () => {
		const requiresActiveItemTests = [
			{ key: 'r', handler: 'reply' },
			{ key: 'f', handler: 'favorite' },
			{ key: 'x', handler: 'flag' },
			{ key: 'n', handler: 'next' },
			{ key: 'p', handler: 'previous' },
			{ key: 'u', handler: 'upvote' },
			{ key: 'd', handler: 'downvote' },
			{ key: 'c', handler: 'collapseToggle' },
			{ key: '0', handler: 'openReferenceLink' },
		];

		for (const { key, handler } of requiresActiveItemTests) {
			it(`${key} should not trigger without active item`, () => {
				keyboardNavigation(ctx, doc, comments);
				dispatchKeydown(key);

				expect(
					itemKeyboardHandlers[handler as keyof typeof itemKeyboardHandlers]
				).not.toHaveBeenCalled();
			});
		}
	});

	describe('combo key handling', () => {
		const comboKeyTests = [
			{ key: 'r', handler: 'reply' },
			{ key: 'f', handler: 'favorite' },
			{ key: 'x', handler: 'flag' },
			{ key: 'n', handler: 'next' },
			{ key: 'p', handler: 'previous' },
			{ key: 'u', handler: 'upvote' },
			{ key: 'd', handler: 'downvote' },
			{ key: 'c', handler: 'collapseToggle' },
		];

		for (const { key, handler } of comboKeyTests) {
			it(`${key} should not trigger with metaKey`, () => {
				keyboardNavigation(ctx, doc, comments);
				dispatchKeydown(key, { metaKey: true });

				expect(
					itemKeyboardHandlers[handler as keyof typeof itemKeyboardHandlers]
				).not.toHaveBeenCalled();
			});

			it(`${key} should not trigger with ctrlKey`, () => {
				keyboardNavigation(ctx, doc, comments);
				dispatchKeydown(key, { ctrlKey: true });

				expect(
					itemKeyboardHandlers[handler as keyof typeof itemKeyboardHandlers]
				).not.toHaveBeenCalled();
			});
		}

		it('Escape should not trigger with combo key', () => {
			keyboardNavigation(ctx, doc, comments);
			dispatchKeydown('Escape', { metaKey: true });

			expect(itemKeyboardHandlers.escape).not.toHaveBeenCalled();
		});
	});

	describe('prevent() method', () => {
		it('should trigger handlers when non-reply textarea is focused', () => {
			const textarea = doc.createElement('textarea');
			doc.body.appendChild(textarea);

			// Simulate textarea being focused by setting it as activeElement
			Object.defineProperty(doc, 'activeElement', {
				configurable: true,
				get: () => textarea,
			});

			keyboardNavigation(ctx, doc, comments);

			const comment = comments[0];
			if (comment) {
				comment.click();
			}

			dispatchKeydown('j');

			expect(itemKeyboardHandlers.move).toHaveBeenCalled();

			// Cleanup
			delete (doc as any).activeElement;
		});

		it('should not trigger handlers when reply textarea is focused', () => {
			const tr = doc.createElement('tr');
			const textarea = doc.createElement('textarea');
			tr.appendChild(textarea);
			doc.body.appendChild(tr);

			// Simulate textarea being focused by setting it as activeElement
			Object.defineProperty(doc, 'activeElement', {
				configurable: true,
				get: () => textarea,
			});

			keyboardNavigation(ctx, doc, comments);

			const comment = comments[0];
			if (comment) {
				comment.click();
			}

			dispatchKeydown('j');

			expect(itemKeyboardHandlers.move).not.toHaveBeenCalled();

			// Cleanup
			delete (doc as any).activeElement;
		});

		it('should not trigger handlers when input is focused', () => {
			const input = doc.createElement('input');
			doc.body.appendChild(input);

			// Simulate input being focused by setting it as activeElement
			Object.defineProperty(doc, 'activeElement', {
				configurable: true,
				get: () => input,
			});

			keyboardNavigation(ctx, doc, comments);

			const comment = comments[0];
			if (comment) {
				comment.click();
			}

			dispatchKeydown('k');

			expect(itemKeyboardHandlers.move).not.toHaveBeenCalled();

			// Cleanup
			delete (doc as any).activeElement;
		});

		it('should blur anchor and trigger handlers when anchor is focused', () => {
			keyboardNavigation(ctx, doc, comments);

			const anchor = doc.createElement('a');
			anchor.href = '#';
			doc.body.appendChild(anchor);
			const blurSpy = vi.spyOn(anchor, 'blur');

			// Simulate anchor being focused by setting it as activeElement
			Object.defineProperty(doc, 'activeElement', {
				configurable: true,
				get: () => anchor,
			});

			const comment = comments[0];
			if (comment) {
				comment.click();
			}

			dispatchKeydown('j');

			expect(blurSpy).toHaveBeenCalled();
			expect(itemKeyboardHandlers.move).toHaveBeenCalled();

			// Cleanup
			delete (doc as any).activeElement;
		});

		it('should activate comment when clicking while non-reply textarea is focused', () => {
			const textarea = doc.createElement('textarea');
			doc.body.appendChild(textarea);

			// Simulate textarea being focused by setting it as activeElement
			Object.defineProperty(doc, 'activeElement', {
				configurable: true,
				get: () => textarea,
			});

			keyboardNavigation(ctx, doc, comments);
			const comment = comments[0];
			if (!comment) {
				throw new Error('Expected comment to exist');
			}

			const clickEvent = new PointerEvent('click', {
				bubbles: true,
			});
			Object.defineProperty(clickEvent, 'target', {
				value: comment,
				enumerable: true,
			});
			comment.dispatchEvent(clickEvent);

			expect(itemKeyboardHandlers.activate).toHaveBeenCalled();
			doc.body.removeChild(textarea);

			// Cleanup
			delete (doc as any).activeElement;
		});

		it('should not activate comment when clicking while input is focused', () => {
			const input = doc.createElement('input');
			doc.body.appendChild(input);

			// Simulate input being focused by setting it as activeElement
			Object.defineProperty(doc, 'activeElement', {
				configurable: true,
				get: () => input,
			});

			keyboardNavigation(ctx, doc, comments);
			const comment = comments[0];
			if (!comment) {
				throw new Error('Expected comment to exist');
			}

			const clickEvent = new PointerEvent('click', {
				bubbles: true,
			});
			Object.defineProperty(clickEvent, 'target', {
				value: comment,
				enumerable: true,
			});
			comment.dispatchEvent(clickEvent);

			expect(itemKeyboardHandlers.activate).not.toHaveBeenCalled();
			doc.body.removeChild(input);

			// Cleanup
			delete (doc as any).activeElement;
		});

		it('should not trigger handlers when reply textarea is focused', () => {
			// Create a comment row with a reply textarea
			const tr = doc.createElement('tr');
			const textarea = doc.createElement('textarea');
			tr.appendChild(textarea);
			doc.body.appendChild(tr);

			// Simulate reply textarea being focused by setting it as activeElement
			Object.defineProperty(doc, 'activeElement', {
				configurable: true,
				get: () => textarea,
			});

			keyboardNavigation(ctx, doc, comments);

			const comment = comments[0];
			if (comment) {
				comment.click();
			}

			dispatchKeydown('j');

			expect(itemKeyboardHandlers.move).not.toHaveBeenCalled();

			// Cleanup
			doc.body.removeChild(tr);
			delete (doc as any).activeElement;
		});
	});

	describe('click handler', () => {
		it('should activate item when comment is clicked', () => {
			keyboardNavigation(ctx, doc, comments);
			const comment = comments[0];
			if (!comment) {
				throw new Error('Expected comment to exist');
			}

			const clickEvent = new PointerEvent('click', {
				bubbles: true,
			});
			Object.defineProperty(clickEvent, 'target', {
				value: comment,
				enumerable: true,
			});
			comment.dispatchEvent(clickEvent);

			expect(itemKeyboardHandlers.activate).toHaveBeenCalled();
		});
	});

	describe('document click handler', () => {
		it('should deactivate comment when clicking outside comments area', () => {
			keyboardNavigation(ctx, doc, comments);

			// Activate a comment first
			const comment = comments[0];
			if (!comment) {
				throw new Error('Expected comment to exist');
			}
			comment.click();

			// Clear the spy to only count later calls
			vi.mocked(itemKeyboardHandlers.escape).mockClear();

			// Click outside the comments area
			const outsideElement = doc.createElement('div');
			doc.body.appendChild(outsideElement);

			const clickEvent = new PointerEvent('click', {
				bubbles: true,
			});
			Object.defineProperty(clickEvent, 'target', {
				value: outsideElement,
				enumerable: true,
			});
			doc.dispatchEvent(clickEvent);

			expect(itemKeyboardHandlers.escape).toHaveBeenCalled();
		});

		it('should not deactivate comment when clicking inside comments area', () => {
			keyboardNavigation(ctx, doc, comments);

			// Activate a comment first
			const comment = comments[0];
			if (!comment) {
				throw new Error('Expected comment to exist');
			}
			comment.click();

			// Clear the spy to only count later calls
			vi.mocked(itemKeyboardHandlers.escape).mockClear();

			// Click inside a comment
			const insideElement = doc.createElement('span');
			comment.appendChild(insideElement);

			const clickEvent = new PointerEvent('click', {
				bubbles: true,
			});
			Object.defineProperty(clickEvent, 'target', {
				value: insideElement,
				enumerable: true,
			});
			doc.dispatchEvent(clickEvent);

			expect(itemKeyboardHandlers.escape).not.toHaveBeenCalled();
		});

		it('should not deactivate when clicking on a textarea', () => {
			keyboardNavigation(ctx, doc, comments);

			// Activate a comment first
			const comment = comments[0];
			if (!comment) {
				throw new Error('Expected comment to exist');
			}
			comment.click();

			// Clear the spy to only count later calls
			vi.mocked(itemKeyboardHandlers.escape).mockClear();

			// Click on a textarea
			const textarea = doc.createElement('textarea');
			doc.body.appendChild(textarea);

			const clickEvent = new PointerEvent('click', {
				bubbles: true,
			});
			Object.defineProperty(clickEvent, 'target', {
				value: textarea,
				enumerable: true,
			});
			doc.dispatchEvent(clickEvent);

			expect(itemKeyboardHandlers.escape).not.toHaveBeenCalled();
		});

		it('should not deactivate when clicking on an input', () => {
			keyboardNavigation(ctx, doc, comments);

			// Activate a comment first
			const comment = comments[0];
			if (!comment) {
				throw new Error('Expected comment to exist');
			}
			comment.click();

			// Clear the spy to only count later calls
			vi.mocked(itemKeyboardHandlers.escape).mockClear();

			// Click on an input
			const input = doc.createElement('input');
			doc.body.appendChild(input);

			const clickEvent = new PointerEvent('click', {
				bubbles: true,
			});
			Object.defineProperty(clickEvent, 'target', {
				value: input,
				enumerable: true,
			});
			doc.dispatchEvent(clickEvent);

			expect(itemKeyboardHandlers.escape).not.toHaveBeenCalled();
		});

		it('should not deactivate when no comment is active', () => {
			keyboardNavigation(ctx, doc, comments);

			// Don't activate any comment

			// Click outside
			const outsideElement = doc.createElement('div');
			doc.body.appendChild(outsideElement);

			const clickEvent = new PointerEvent('click', {
				bubbles: true,
			});
			Object.defineProperty(clickEvent, 'target', {
				value: outsideElement,
				enumerable: true,
			});
			doc.dispatchEvent(clickEvent);

			expect(itemKeyboardHandlers.escape).not.toHaveBeenCalled();
		});
	});

	describe('cleanup on invalidation', () => {
		it('should remove keydown listener on invalidation', () => {
			const addSpy = vi.spyOn(doc, 'addEventListener');
			const removeSpy = vi.spyOn(doc, 'removeEventListener');

			keyboardNavigation(ctx, doc, comments);
			const keydownHandler = addSpy.mock.calls[0]?.[1];

			invalidateCallback();

			expect(removeSpy).toHaveBeenCalledWith('keydown', keydownHandler);
		});

		it('should remove click listeners from comments on invalidation', () => {
			const comment = comments[0];
			if (!comment) {
				throw new Error('Expected comment to exist');
			}
			const removeSpy = vi.spyOn(comment, 'removeEventListener');

			keyboardNavigation(ctx, doc, comments);

			invalidateCallback();

			expect(removeSpy).toHaveBeenCalledWith('click', expect.any(Function));
		});

		it('should remove document click listener on invalidation', () => {
			const addSpy = vi.spyOn(doc, 'addEventListener');
			const removeSpy = vi.spyOn(doc, 'removeEventListener');

			keyboardNavigation(ctx, doc, comments);
			const documentClickHandler = addSpy.mock.calls.find((call) => call[0] === 'click')?.[1];

			invalidateCallback();

			expect(removeSpy).toHaveBeenCalledWith('click', documentClickHandler);
		});
	});
});
