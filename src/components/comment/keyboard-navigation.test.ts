/** biome-ignore-all lint/performance/noDelete: tests */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ContentScriptContext } from '#imports';
import { focusClass, focusClassDefault } from '@/components/comment/hn-comment.ts';
import { KeyboardHandlers } from '@/components/comment/keyboard-handlers.ts';
import { keyboardNavigation } from '@/components/comment/keyboard-navigation.ts';
import lStorage from '@/utils/localStorage.ts';

const noop = () => {
	/* intentionally empty */
};

interface TestContext {
	doc: Document;
	comments: HTMLElement[];
	ctx: ContentScriptContext;
	invalidate: () => void;
}

const createCommentRow = (doc: Document, id: number): HTMLElement => {
	const tr = doc.createElement('tr');
	tr.id = `item-${id}`;
	tr.classList.add('comtr');
	tr.classList.add('athing');
	doc.body.appendChild(tr);
	return tr;
};

const createComments = (doc: Document, count: number): HTMLElement[] =>
	Array.from({ length: count }, (_, index) => createCommentRow(doc, index + 1));

const createContext = (): { ctx: ContentScriptContext; invalidate: () => void } => {
	let invalidateCallback = noop;
	const ctx = {
		onInvalidated: vi.fn((cb) => {
			invalidateCallback = cb;
		}),
	} as unknown as ContentScriptContext;

	return {
		ctx,
		invalidate: () => invalidateCallback(),
	};
};

const createTestContext = (commentCount = 3): TestContext => {
	const doc = document.implementation.createHTMLDocument();
	const comments = createComments(doc, commentCount);
	const { ctx, invalidate } = createContext();
	vi.spyOn(doc.body, 'scrollTo').mockImplementation(noop);
	vi.spyOn(KeyboardHandlers.prototype, 'move');
	vi.spyOn(KeyboardHandlers.prototype, 'escape');
	vi.spyOn(KeyboardHandlers.prototype, 'reply');
	vi.spyOn(KeyboardHandlers.prototype, 'favorite');
	vi.spyOn(KeyboardHandlers.prototype, 'flag');
	vi.spyOn(KeyboardHandlers.prototype, 'next');
	vi.spyOn(KeyboardHandlers.prototype, 'previous');
	vi.spyOn(KeyboardHandlers.prototype, 'upvote');
	vi.spyOn(KeyboardHandlers.prototype, 'downvote');
	vi.spyOn(KeyboardHandlers.prototype, 'collapseToggle');
	vi.spyOn(KeyboardHandlers.prototype, 'openReferenceLink');
	vi.spyOn(KeyboardHandlers.prototype, 'activateElement');
	vi.spyOn(KeyboardHandlers.prototype, 'checkActiveState');
	vi.spyOn(lStorage, 'getItem').mockResolvedValue(null);

	return { doc, comments, ctx, invalidate };
};

const dispatchKeydown = (doc: Document, key: string, options: Partial<KeyboardEvent> = {}) => {
	const event = new KeyboardEvent('keydown', {
		key,
		bubbles: true,
		...options,
	});
	doc.dispatchEvent(event);
	return event;
};

const dispatchClick = (dispatcher: EventTarget, target: HTMLElement) => {
	const clickEvent = new PointerEvent('click', {
		bubbles: true,
	});
	Object.defineProperty(clickEvent, 'target', {
		value: target,
		enumerable: true,
	});
	dispatcher.dispatchEvent(clickEvent);
};

const getComment = (comments: HTMLElement[], index: number): HTMLElement => {
	const comment = comments[index];
	if (!comment) {
		throw new Error('Expected comment to exist');
	}
	return comment;
};

const setActiveElement = (doc: Document, element: HTMLElement) => {
	Object.defineProperty(doc, 'activeElement', {
		configurable: true,
		get: () => element,
	});
};

const clearActiveElement = (doc: Document) => {
	delete (doc as unknown as { activeElement?: HTMLElement }).activeElement;
};

describe('keyboardNavigation', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('initialization', () => {
		it('should inject focus styles into document head', async () => {
			const { doc, comments, ctx, invalidate } = createTestContext();

			await keyboardNavigation(ctx, doc, comments);

			const styleElement = doc.head.querySelector('style');
			expect(styleElement).toBeDefined();
			expect(styleElement?.textContent).toContain(`tr.${focusClass} td`);
			expect(styleElement?.textContent).toContain(`td.${focusClassDefault}`);
			expect(styleElement?.textContent).toContain('--oj-focus-color: #f7694c');

			invalidate();
		});

		it('should re-check active state on pageshow', async () => {
			const { doc, comments, ctx, invalidate } = createTestContext();

			await keyboardNavigation(ctx, doc, comments);
			vi.mocked(KeyboardHandlers.prototype.checkActiveState).mockClear();

			window.dispatchEvent(new Event('pageshow'));

			expect(KeyboardHandlers.prototype.checkActiveState).toHaveBeenCalled();

			invalidate();
		});

		it('should register onInvalidated callback', async () => {
			const { doc, comments, ctx, invalidate } = createTestContext();

			await keyboardNavigation(ctx, doc, comments);

			expect(ctx.onInvalidated).toHaveBeenCalledWith(expect.any(Function));

			invalidate();
		});
	});

	describe('keyboard shortcuts', () => {
		const keyHandlerTests = [
			{ name: 'j should move down', key: 'j', handler: 'move' },
			{ name: 'J should move down', key: 'J', handler: 'move' },
			{ name: 'k should move up', key: 'k', handler: 'move' },
			{ name: 'K should move up', key: 'K', handler: 'move' },
			{ name: 'n should call next', key: 'n', handler: 'next' },
			{ name: 'p should call previous', key: 'p', handler: 'previous' },
			{ name: 'u should call upvote', key: 'u', handler: 'upvote' },
			{ name: 'd should call downvote', key: 'd', handler: 'downvote' },
			{ name: 'r should call reply', key: 'r', handler: 'reply' },
			{ name: 'f should call favorite', key: 'f', handler: 'favorite' },
			{ name: 'X should call flag', key: 'X', handler: 'flag' },
		];

		describe('runs a bunch of tests in a loop', () => {
			for (const { name, key, handler } of keyHandlerTests) {
				it(name, async () => {
					const { doc, comments, ctx, invalidate } = createTestContext();

					await keyboardNavigation(ctx, doc, comments);
					getComment(comments, 0).click();

					dispatchKeydown(doc, key, { shiftKey: key === key.toUpperCase() });

					expect(
						KeyboardHandlers.prototype[handler as keyof KeyboardHandlers]
					).toHaveBeenCalled();

					invalidate();
				});
			}
		});

		it('Escape should call escape handler', async () => {
			const { doc, comments, ctx, invalidate } = createTestContext();

			await keyboardNavigation(ctx, doc, comments);
			dispatchKeydown(doc, 'Escape');

			expect(KeyboardHandlers.prototype.escape).toHaveBeenCalled();

			invalidate();
		});

		it('escape should call escape handler', async () => {
			const { doc, comments, ctx, invalidate } = createTestContext();

			await keyboardNavigation(ctx, doc, comments);
			dispatchKeydown(doc, 'escape');

			expect(KeyboardHandlers.prototype.escape).toHaveBeenCalled();

			invalidate();
		});

		it('c should call collapseToggle', async () => {
			const { doc, comments, ctx, invalidate } = createTestContext();

			await keyboardNavigation(ctx, doc, comments);
			getComment(comments, 0).click();
			dispatchKeydown(doc, 'c');

			expect(KeyboardHandlers.prototype.collapseToggle).toHaveBeenCalled();

			invalidate();
		});

		it('t should scroll to top', async () => {
			const { doc, comments, ctx, invalidate } = createTestContext();

			await keyboardNavigation(ctx, doc, comments);
			dispatchKeydown(doc, 't');

			expect(doc.body.scrollTo).toHaveBeenCalledWith(0, 0);

			invalidate();
		});

		it('b should go back when paginated', async () => {
			const { doc, comments, ctx, invalidate } = createTestContext();
			const backSpy = vi.spyOn(window.history, 'back');
			const locationSpy = vi
				.spyOn(window, 'location', 'get')
				.mockReturnValue(new URL('https://news.ycombinator.com/item?id=1&p=2') as any);

			await keyboardNavigation(ctx, doc, comments);
			dispatchKeydown(doc, 'b');

			expect(backSpy).toHaveBeenCalled();

			locationSpy.mockRestore();
			invalidate();
		});

		describe('number keys', () => {
			const numbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

			for (const num of numbers) {
				it(`${num} should call openReferenceLink`, async () => {
					const { doc, comments, ctx, invalidate } = createTestContext();

					await keyboardNavigation(ctx, doc, comments);
					getComment(comments, 0).click();
					dispatchKeydown(doc, num);

					expect(KeyboardHandlers.prototype.openReferenceLink).toHaveBeenCalled();

					invalidate();
				});
			}
		});
	});

	describe('escape with reply open', () => {
		it('should click reply button when reply is stored', async () => {
			const { doc, comments, ctx, invalidate } = createTestContext();

			await keyboardNavigation(ctx, doc, comments);
			getComment(comments, 0).click();

			const replyBtn = doc.createElement('a');
			replyBtn.href = 'reply?id=123';
			const clickSpy = vi.spyOn(replyBtn, 'click');
			vi.mocked(KeyboardHandlers.prototype.reply).mockReturnValueOnce(replyBtn);

			dispatchKeydown(doc, 'r');
			dispatchKeydown(doc, 'Escape');

			expect(clickSpy).toHaveBeenCalledTimes(1);

			invalidate();
		});

		it('should clear reply after clicking', async () => {
			const { doc, comments, ctx, invalidate } = createTestContext();

			await keyboardNavigation(ctx, doc, comments);
			const replyBtn = doc.createElement('a');
			replyBtn.href = 'reply?id=123';
			vi.spyOn(replyBtn, 'click');
			vi.mocked(KeyboardHandlers.prototype.reply).mockReturnValue(replyBtn);

			dispatchKeydown(doc, 'r');
			dispatchKeydown(doc, 'Escape');
			dispatchKeydown(doc, 'Escape');

			expect(KeyboardHandlers.prototype.escape).toHaveBeenCalled();

			invalidate();
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
			it(`${key} should not trigger without active item`, async () => {
				const { doc, comments, ctx, invalidate } = createTestContext();

				await keyboardNavigation(ctx, doc, comments);
				dispatchKeydown(doc, key);

				expect(
					KeyboardHandlers.prototype[handler as keyof KeyboardHandlers]
				).not.toHaveBeenCalled();

				invalidate();
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
			it(`${key} should not trigger with metaKey`, async () => {
				const { doc, comments, ctx, invalidate } = createTestContext();

				await keyboardNavigation(ctx, doc, comments);
				dispatchKeydown(doc, key, { metaKey: true });

				expect(
					KeyboardHandlers.prototype[handler as keyof KeyboardHandlers]
				).not.toHaveBeenCalled();

				invalidate();
			});

			it(`${key} should not trigger with ctrlKey`, async () => {
				const { doc, comments, ctx, invalidate } = createTestContext();

				await keyboardNavigation(ctx, doc, comments);
				dispatchKeydown(doc, key, { ctrlKey: true });

				expect(
					KeyboardHandlers.prototype[handler as keyof KeyboardHandlers]
				).not.toHaveBeenCalled();

				invalidate();
			});
		}

		it('Escape should not trigger with combo key', async () => {
			const { doc, comments, ctx, invalidate } = createTestContext();

			await keyboardNavigation(ctx, doc, comments);
			dispatchKeydown(doc, 'Escape', { metaKey: true });

			expect(KeyboardHandlers.prototype.escape).not.toHaveBeenCalled();

			invalidate();
		});
	});

	describe('prevent() method', () => {
		it('should trigger handlers when a non-reply textarea is focused', async () => {
			const { doc, comments, ctx, invalidate } = createTestContext();
			const textarea = doc.createElement('textarea');
			doc.body.appendChild(textarea);
			setActiveElement(doc, textarea);

			await keyboardNavigation(ctx, doc, comments);
			getComment(comments, 0).click();
			dispatchKeydown(doc, 'j');

			expect(KeyboardHandlers.prototype.move).toHaveBeenCalled();

			clearActiveElement(doc);
			invalidate();
		});

		it('should not trigger handlers when reply textarea is focused', async () => {
			const { doc, comments, ctx, invalidate } = createTestContext();
			const tr = doc.createElement('tr');
			const textarea = doc.createElement('textarea');
			tr.appendChild(textarea);
			doc.body.appendChild(tr);
			setActiveElement(doc, textarea);

			await keyboardNavigation(ctx, doc, comments);
			getComment(comments, 0).click();
			dispatchKeydown(doc, 'j');

			expect(KeyboardHandlers.prototype.move).not.toHaveBeenCalled();

			doc.body.removeChild(tr);
			clearActiveElement(doc);
			invalidate();
		});

		it('should not trigger handlers when input is focused', async () => {
			const { doc, comments, ctx, invalidate } = createTestContext();
			const input = doc.createElement('input');
			doc.body.appendChild(input);
			setActiveElement(doc, input);

			await keyboardNavigation(ctx, doc, comments);
			getComment(comments, 0).click();
			dispatchKeydown(doc, 'k');

			expect(KeyboardHandlers.prototype.move).not.toHaveBeenCalled();

			doc.body.removeChild(input);
			clearActiveElement(doc);
			invalidate();
		});

		it('should blur anchor and trigger handlers when anchor is focused', async () => {
			const { doc, comments, ctx, invalidate } = createTestContext();
			const anchor = doc.createElement('a');
			anchor.href = '#';
			doc.body.appendChild(anchor);
			const blurSpy = vi.spyOn(anchor, 'blur');
			setActiveElement(doc, anchor);

			await keyboardNavigation(ctx, doc, comments);
			getComment(comments, 0).click();
			dispatchKeydown(doc, 'j');

			expect(blurSpy).toHaveBeenCalled();
			expect(KeyboardHandlers.prototype.move).toHaveBeenCalled();

			clearActiveElement(doc);
			invalidate();
		});

		it('should activate comment when clicking while a non-reply textarea is focused', async () => {
			const { doc, comments, ctx, invalidate } = createTestContext();
			const textarea = doc.createElement('textarea');
			doc.body.appendChild(textarea);
			setActiveElement(doc, textarea);

			await keyboardNavigation(ctx, doc, comments);
			const comment = getComment(comments, 0);
			dispatchClick(comment, comment);

			expect(KeyboardHandlers.prototype.activateElement).toHaveBeenCalled();

			doc.body.removeChild(textarea);
			clearActiveElement(doc);
			invalidate();
		});

		it('should activate comment when clicking while input is focused', async () => {
			const { doc, comments, ctx, invalidate } = createTestContext();
			const input = doc.createElement('input');
			doc.body.appendChild(input);
			setActiveElement(doc, input);

			await keyboardNavigation(ctx, doc, comments);
			const comment = getComment(comments, 0);
			dispatchClick(comment, comment);

			expect(KeyboardHandlers.prototype.activateElement).toHaveBeenCalled();

			doc.body.removeChild(input);
			clearActiveElement(doc);
			invalidate();
		});
	});

	describe('click handler', () => {
		it('should activate item when comment is clicked', async () => {
			const { doc, comments, ctx, invalidate } = createTestContext();

			await keyboardNavigation(ctx, doc, comments);
			const comment = getComment(comments, 0);
			dispatchClick(comment, comment);

			expect(KeyboardHandlers.prototype.activateElement).toHaveBeenCalled();

			invalidate();
		});
	});

	describe('document click handler', () => {
		it('should deactivate comment when clicking outside comments area', async () => {
			const { doc, comments, ctx, invalidate } = createTestContext();

			await keyboardNavigation(ctx, doc, comments);
			getComment(comments, 0).click();
			vi.mocked(KeyboardHandlers.prototype.escape).mockClear();

			const outsideElement = doc.createElement('div');
			doc.body.appendChild(outsideElement);
			dispatchClick(doc, outsideElement);

			expect(KeyboardHandlers.prototype.escape).toHaveBeenCalled();

			invalidate();
		});

		it('should not deactivate comment when clicking inside comments area', async () => {
			const { doc, comments, ctx, invalidate } = createTestContext();

			await keyboardNavigation(ctx, doc, comments);
			const comment = getComment(comments, 0);
			comment.click();
			vi.mocked(KeyboardHandlers.prototype.escape).mockClear();

			const insideElement = doc.createElement('span');
			comment.appendChild(insideElement);
			dispatchClick(doc, insideElement);

			expect(KeyboardHandlers.prototype.escape).not.toHaveBeenCalled();

			invalidate();
		});

		it('should not deactivate when clicking on a textarea', async () => {
			const { doc, comments, ctx, invalidate } = createTestContext();

			await keyboardNavigation(ctx, doc, comments);
			getComment(comments, 0).click();
			vi.mocked(KeyboardHandlers.prototype.escape).mockClear();

			const textarea = doc.createElement('textarea');
			doc.body.appendChild(textarea);
			dispatchClick(doc, textarea);

			expect(KeyboardHandlers.prototype.escape).not.toHaveBeenCalled();

			invalidate();
		});

		it('should not deactivate when clicking on an input', async () => {
			const { doc, comments, ctx, invalidate } = createTestContext();

			await keyboardNavigation(ctx, doc, comments);
			getComment(comments, 0).click();
			vi.mocked(KeyboardHandlers.prototype.escape).mockClear();

			const input = doc.createElement('input');
			doc.body.appendChild(input);
			dispatchClick(doc, input);

			expect(KeyboardHandlers.prototype.escape).not.toHaveBeenCalled();

			invalidate();
		});

		it('should not deactivate when no comment is active', async () => {
			const { doc, comments, ctx, invalidate } = createTestContext();

			await keyboardNavigation(ctx, doc, comments);

			const outsideElement = doc.createElement('div');
			doc.body.appendChild(outsideElement);
			dispatchClick(doc, outsideElement);

			expect(KeyboardHandlers.prototype.escape).not.toHaveBeenCalled();

			invalidate();
		});
	});

	describe('cleanup on invalidation', () => {
		it('should remove keydown listener on invalidation', async () => {
			const { doc, comments, ctx, invalidate } = createTestContext();
			const addSpy = vi.spyOn(doc, 'addEventListener');
			const removeSpy = vi.spyOn(doc, 'removeEventListener');

			await keyboardNavigation(ctx, doc, comments);
			const keydownHandler = addSpy.mock.calls[0]?.[1];

			invalidate();

			expect(removeSpy).toHaveBeenCalledWith('keydown', keydownHandler);
		});

		it('should remove click listeners from comments on invalidation', async () => {
			const { doc, comments, ctx, invalidate } = createTestContext();
			const comment = getComment(comments, 0);
			const removeSpy = vi.spyOn(comment, 'removeEventListener');

			await keyboardNavigation(ctx, doc, comments);

			invalidate();

			expect(removeSpy).toHaveBeenCalledWith('click', expect.any(Function), undefined);
			expect(removeSpy).toHaveBeenCalledTimes(1);
		});

		it('should remove document click listener on invalidation', async () => {
			const { doc, comments, ctx, invalidate } = createTestContext();
			const addSpy = vi.spyOn(doc, 'addEventListener');
			const removeSpy = vi.spyOn(doc, 'removeEventListener');

			await keyboardNavigation(ctx, doc, comments);
			const documentClickHandler = addSpy.mock.calls.find((call) => call[0] === 'click')?.[1];

			invalidate();

			expect(removeSpy).toHaveBeenCalledWith('click', documentClickHandler);
		});
	});
});
