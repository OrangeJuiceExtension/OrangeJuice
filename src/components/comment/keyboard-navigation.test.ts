import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContentScriptContext } from 'wxt/utils/content-script-context';
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
			const tr = document.createElement('tr');
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
		window.dispatchEvent(event);
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
		vi.spyOn(document.body, 'scrollTo').mockImplementation(noop);
		vi.spyOn(itemKeyboardHandlers, 'move');
		vi.spyOn(itemKeyboardHandlers, 'escape');
		vi.spyOn(itemKeyboardHandlers, 'reply');
		vi.spyOn(itemKeyboardHandlers, 'favorite');
		vi.spyOn(itemKeyboardHandlers, 'next');
		vi.spyOn(itemKeyboardHandlers, 'previous');
		vi.spyOn(itemKeyboardHandlers, 'upvote');
		vi.spyOn(itemKeyboardHandlers, 'downvote');
		vi.spyOn(itemKeyboardHandlers, 'collapseToggle');
		vi.spyOn(itemKeyboardHandlers, 'openReferenceLink');
		vi.spyOn(itemKeyboardHandlers, 'activate');
	});

	describe('initialization', () => {
		it('should inject focus styles into document head', () => {
			keyboardNavigation(doc, comments, ctx);

			const styleElement = doc.head.querySelector('style');
			expect(styleElement).toBeDefined();
			expect(styleElement?.textContent).toContain('.oj_focused_item .default');
			expect(styleElement?.textContent).toContain('outline: 3px solid #f7694c73');
		});

		it('should register onInvalidated callback', () => {
			keyboardNavigation(doc, comments, ctx);

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
		];

		for (const { name, key, handler } of keyHandlerTests) {
			it(name, () => {
				keyboardNavigation(doc, comments, ctx);
				const comment = comments[0];
				if (comment) {
					comment.click();
				}
				dispatchKeydown(key);

				expect(
					itemKeyboardHandlers[handler as keyof typeof itemKeyboardHandlers]
				).toHaveBeenCalled();
			});
		}

		it('Escape should call escape handler', () => {
			keyboardNavigation(doc, comments, ctx);
			dispatchKeydown('Escape');

			expect(itemKeyboardHandlers.escape).toHaveBeenCalled();
		});

		it('escape should call escape handler', () => {
			keyboardNavigation(doc, comments, ctx);
			dispatchKeydown('escape');

			expect(itemKeyboardHandlers.escape).toHaveBeenCalled();
		});

		it('c should call collapseToggle', () => {
			keyboardNavigation(doc, comments, ctx);
			const comment = comments[0];
			if (comment) {
				comment.click();
			}
			dispatchKeydown('c');

			expect(itemKeyboardHandlers.collapseToggle).toHaveBeenCalled();
		});

		it('t should scroll to top', () => {
			keyboardNavigation(doc, comments, ctx);
			dispatchKeydown('t');

			expect(document.body.scrollTo).toHaveBeenCalledWith(0, 0);
		});

		describe('number keys', () => {
			const numbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

			for (const num of numbers) {
				it(`${num} should call openReferenceLink`, () => {
					keyboardNavigation(doc, comments, ctx);
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
			keyboardNavigation(doc, comments, ctx);
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
			keyboardNavigation(doc, comments, ctx);
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
			{ key: 'n', handler: 'next' },
			{ key: 'p', handler: 'previous' },
			{ key: 'u', handler: 'upvote' },
			{ key: 'd', handler: 'downvote' },
			{ key: 'c', handler: 'collapseToggle' },
			{ key: '0', handler: 'openReferenceLink' },
		];

		for (const { key, handler } of requiresActiveItemTests) {
			it(`${key} should not trigger without active item`, () => {
				keyboardNavigation(doc, comments, ctx);
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
			{ key: 'n', handler: 'next' },
			{ key: 'p', handler: 'previous' },
			{ key: 'u', handler: 'upvote' },
			{ key: 'd', handler: 'downvote' },
			{ key: 'c', handler: 'collapseToggle' },
		];

		for (const { key, handler } of comboKeyTests) {
			it(`${key} should not trigger with metaKey`, () => {
				keyboardNavigation(doc, comments, ctx);
				dispatchKeydown(key, { metaKey: true });

				expect(
					itemKeyboardHandlers[handler as keyof typeof itemKeyboardHandlers]
				).not.toHaveBeenCalled();
			});

			it(`${key} should not trigger with ctrlKey`, () => {
				keyboardNavigation(doc, comments, ctx);
				dispatchKeydown(key, { ctrlKey: true });

				expect(
					itemKeyboardHandlers[handler as keyof typeof itemKeyboardHandlers]
				).not.toHaveBeenCalled();
			});
		}

		it('Escape should not trigger with combo key', () => {
			keyboardNavigation(doc, comments, ctx);
			dispatchKeydown('Escape', { metaKey: true });

			expect(itemKeyboardHandlers.escape).not.toHaveBeenCalled();
		});
	});

	describe('prevent() method', () => {
		it('should not trigger handlers when textarea is focused', () => {
			const textarea = doc.createElement('textarea');
			doc.body.appendChild(textarea);
			textarea.focus();

			keyboardNavigation(doc, comments, ctx);
			const comment = comments[0];
			if (comment) {
				comment.click();
			}

			dispatchKeydown('j');

			expect(itemKeyboardHandlers.move).not.toHaveBeenCalled();
		});

		it('should not trigger handlers when input is focused', () => {
			const input = doc.createElement('input');
			doc.body.appendChild(input);
			input.focus();

			keyboardNavigation(doc, comments, ctx);
			const comment = comments[0];
			if (comment) {
				comment.click();
			}

			dispatchKeydown('k');

			expect(itemKeyboardHandlers.move).not.toHaveBeenCalled();
		});

		it('should blur anchor and trigger handlers when anchor is focused', () => {
			const anchor = doc.createElement('a');
			anchor.href = '#';
			doc.body.appendChild(anchor);
			const blurSpy = vi.spyOn(anchor, 'blur');
			anchor.focus();

			keyboardNavigation(doc, comments, ctx);
			const comment = comments[0];
			if (comment) {
				comment.click();
			}

			dispatchKeydown('j');

			expect(blurSpy).toHaveBeenCalled();
			expect(itemKeyboardHandlers.move).toHaveBeenCalled();
		});

		it('should not activate comment when clicking while textarea is focused', () => {
			const textarea = doc.createElement('textarea');
			doc.body.appendChild(textarea);
			textarea.focus();

			keyboardNavigation(doc, comments, ctx);
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
			doc.body.removeChild(textarea);
		});

		it('should not activate comment when clicking while input is focused', () => {
			const input = doc.createElement('input');
			doc.body.appendChild(input);
			input.focus();

			keyboardNavigation(doc, comments, ctx);
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
		});
	});

	describe('click handler', () => {
		it('should activate item when comment is clicked', () => {
			keyboardNavigation(doc, comments, ctx);
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

	describe('cleanup on invalidation', () => {
		it('should remove keydown listener on invalidation', () => {
			const addSpy = vi.spyOn(window, 'addEventListener');
			const removeSpy = vi.spyOn(window, 'removeEventListener');

			keyboardNavigation(doc, comments, ctx);
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

			keyboardNavigation(doc, comments, ctx);

			invalidateCallback();

			expect(removeSpy).toHaveBeenCalledWith('click', expect.any(Function));
		});
	});
});
