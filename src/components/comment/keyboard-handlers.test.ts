import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CommentData } from '@/components/comment/comment-data.ts';
import { addIndentation, createCommentRow } from '@/components/comment/constants.ts';
import { HNComment } from '@/components/comment/hn-comment.ts';
import { KeyboardHandlers } from '@/components/comment/keyboard-handlers.ts';
import { createClientServices } from '@/services/manager.ts';
import { dom } from '@/utils/dom.ts';
import lStorage from '@/utils/localStorage.ts';
import { parseReferenceLinks } from '@/utils/parse-reference-links.ts';

vi.mock('@/services/manager.ts', () => ({
	createClientServices: vi.fn(() => ({
		getBrowserTabService: vi.fn(() => ({
			createTab: vi.fn(() => Promise.resolve()),
		})),
	})),
}));

vi.mock('@/utils/parse-reference-links.ts', () => ({
	parseReferenceLinks: vi.fn(() => []),
}));

const noop = () => {
	/* intentionally empty */
};

interface CommentSetup {
	commentData: CommentData;
	comments: HNComment[];
	rows: HTMLElement[];
}

const createCommentData = (
	doc: Document,
	count: number,
	options?: { collapsedIds?: number[] }
): CommentSetup => {
	const rows: HTMLElement[] = [];
	const comments: HNComment[] = [];
	const collapsedIds = new Set(options?.collapsedIds ?? []);
	for (let i = 1; i <= count; i += 1) {
		const row = createCommentRow(doc, i, { collapsed: collapsedIds.has(i) });
		rows.push(row);
		comments.push(new HNComment(row));
	}
	return {
		commentData: new CommentData(comments),
		comments,
		rows,
	};
};

describe('commentKeyboardHandlers', () => {
	let doc: Document;
	let keyboardHandlers: KeyboardHandlers;

	beforeEach(() => {
		vi.clearAllMocks();
		doc = document.implementation.createHTMLDocument();
		keyboardHandlers = new KeyboardHandlers(doc);
		vi.spyOn(doc.body, 'scrollTo').mockImplementation(noop);
		vi.spyOn(lStorage, 'getItem').mockResolvedValue(null);
		vi.spyOn(lStorage, 'setItem').mockResolvedValue();
	});

	describe('move', () => {
		describe('when no active item', () => {
			it('should activate first item', async () => {
				const setup = createCommentData(doc, 3);
				const event = { shiftKey: false } as KeyboardEvent;

				await keyboardHandlers.move(event, setup.commentData, 'down');

				expect(setup.commentData.getActiveComment()).toBe(setup.commentData.first());
			});

			it('should skip collapsed first item when skipHidden is true', async () => {
				const setup = createCommentData(doc, 3, { collapsedIds: [1] });
				const event = { shiftKey: false } as KeyboardEvent;

				await keyboardHandlers.move(event, setup.commentData, 'down');

				expect(setup.commentData.getActiveComment()?.id).toBe('comment-2');
			});

			it('should not skip collapsed first item when skipHidden is false', async () => {
				const setup = createCommentData(doc, 3, { collapsedIds: [1] });
				const event = { shiftKey: true } as KeyboardEvent;

				await keyboardHandlers.move(event, setup.commentData, 'down');

				expect(setup.commentData.getActiveComment()?.id).toBe('comment-1');
			});
		});

		describe('when moving down', () => {
			it('should move to next item', async () => {
				const setup = createCommentData(doc, 3);
				const event = { shiftKey: false } as KeyboardEvent;
				const first = setup.commentData.first();
				if (!first) {
					throw new Error('Expected item to exist');
				}
				setup.commentData.activate(first);

				await keyboardHandlers.move(event, setup.commentData, 'down');

				expect(setup.commentData.getActiveComment()?.id).toBe('comment-2');
			});

			it('should click more link when at last item', async () => {
				const setup = createCommentData(doc, 2);
				const event = { shiftKey: false } as KeyboardEvent;
				const last = setup.commentData.last();
				if (!last) {
					throw new Error('Expected item to exist');
				}
				setup.commentData.activate(last);

				const moreLink = doc.createElement('a');
				moreLink.className = 'morelink';
				const clickSpy = vi.spyOn(moreLink, 'click');
				doc.body.appendChild(moreLink);

				await keyboardHandlers.move(event, setup.commentData, 'down');

				expect(clickSpy).toHaveBeenCalled();
				expect(lStorage.setItem).toHaveBeenCalledWith('oj_comment_nav_state', 'next');
			});

			it('should skip collapsed comment children when moving down', async () => {
				const setup = createCommentData(doc, 4, { collapsedIds: [2] });
				const event = { shiftKey: false } as KeyboardEvent;
				const first = setup.commentData.first();
				if (!first) {
					throw new Error('Expected item to exist');
				}

				addIndentation(doc, setup.rows[0], 0);
				addIndentation(doc, setup.rows[1], 0);
				addIndentation(doc, setup.rows[2], 1);
				addIndentation(doc, setup.rows[3], 0);
				setup.commentData.activate(first);

				await keyboardHandlers.move(event, setup.commentData, 'down');

				expect(setup.commentData.getActiveComment()?.id).toBe('comment-4');
			});

			it('should respect collapse state changes after init', async () => {
				const setup = createCommentData(doc, 4);
				const event = { shiftKey: false } as KeyboardEvent;
				const first = setup.commentData.first();
				if (!first) {
					throw new Error('Expected item to exist');
				}

				addIndentation(doc, setup.rows[0], 0);
				addIndentation(doc, setup.rows[1], 0);
				addIndentation(doc, setup.rows[2], 1);
				addIndentation(doc, setup.rows[3], 0);
				setup.commentData.activate(first);

				setup.rows[1]?.classList.add('coll');

				await keyboardHandlers.move(event, setup.commentData, 'down');

				expect(setup.commentData.getActiveComment()?.id).toBe('comment-4');
			});

			it('should expand collapsed parent with deep child on shift key', async () => {
				const setup = createCommentData(doc, 4, { collapsedIds: [2] });
				const event = { shiftKey: true } as KeyboardEvent;
				const first = setup.commentData.first();
				if (!first) {
					throw new Error('Expected item to exist');
				}

				addIndentation(doc, setup.rows[0], 0);
				addIndentation(doc, setup.rows[1], 0);
				addIndentation(doc, setup.rows[2], 2);
				addIndentation(doc, setup.rows[3], 0);
				setup.commentData.activate(first);

				const toggleLink = doc.createElement('a');
				toggleLink.classList.add('togg', 'clicky');
				toggleLink.textContent = '[2 more]';
				setup.rows[1]?.appendChild(toggleLink);
				const clickSpy = vi.spyOn(toggleLink, 'click');

				await keyboardHandlers.move(event, setup.commentData, 'down');

				expect(setup.commentData.getActiveComment()?.id).toBe('comment-2');
				expect(clickSpy).toHaveBeenCalled();
			});

			it('should expand parent when moving down into a hidden comment with shift key', async () => {
				const setup = createCommentData(doc, 4);
				const event = { shiftKey: true } as KeyboardEvent;
				const first = setup.commentData.first();
				if (!first) {
					throw new Error('Expected item to exist');
				}

				addIndentation(doc, setup.rows[0], 0);
				addIndentation(doc, setup.rows[1], 1);
				addIndentation(doc, setup.rows[2], 1);
				addIndentation(doc, setup.rows[3], 0);
				setup.rows[0]?.classList.add('coll');
				setup.rows[1]?.classList.add('noshow');
				setup.rows[2]?.classList.add('noshow');
				setup.commentData.activate(first);

				const toggleLink = doc.createElement('a');
				toggleLink.classList.add('togg', 'clicky');
				toggleLink.textContent = '[2 more]';
				setup.rows[0]?.appendChild(toggleLink);
				const clickSpy = vi.spyOn(toggleLink, 'click');

				await keyboardHandlers.move(event, setup.commentData, 'down');

				expect(clickSpy).toHaveBeenCalled();
				expect(setup.commentData.getActiveComment()?.id).toBe('comment-2');
			});

			it('should traverse into children after expansion when moving down', async () => {
				const setup = createCommentData(doc, 4);
				const eventShift = { shiftKey: true } as KeyboardEvent;
				const event = { shiftKey: false } as KeyboardEvent;
				const first = setup.commentData.first();
				if (!first) {
					throw new Error('Expected item to exist');
				}

				addIndentation(doc, setup.rows[0], 0);
				addIndentation(doc, setup.rows[1], 0);
				addIndentation(doc, setup.rows[2], 1);
				addIndentation(doc, setup.rows[3], 0);
				setup.rows[1]?.classList.add('coll');
				setup.rows[2]?.classList.add('noshow');
				setup.commentData.activate(first);

				const toggleLink = doc.createElement('a');
				toggleLink.classList.add('togg', 'clicky');
				toggleLink.textContent = '[1 more]';
				setup.rows[1]?.appendChild(toggleLink);

				await keyboardHandlers.move(eventShift, setup.commentData, 'down');

				setup.rows[1]?.classList.remove('coll');
				setup.rows[2]?.classList.remove('noshow');

				await keyboardHandlers.move(event, setup.commentData, 'down');

				expect(setup.commentData.getActiveComment()?.id).toBe('comment-3');
			});

			it('should not move when already at last item', async () => {
				const setup = createCommentData(doc, 3);
				const event = { shiftKey: false } as KeyboardEvent;
				const last = setup.commentData.last();
				if (!last) {
					throw new Error('Expected item to exist');
				}
				setup.commentData.activate(last);

				await keyboardHandlers.move(event, setup.commentData, 'down');

				expect(setup.commentData.getActiveComment()).toBe(last);
			});

			it('should toggle collapsed item when shift key is held', async () => {
				const setup = createCommentData(doc, 3, { collapsedIds: [2] });
				const event = { shiftKey: true } as KeyboardEvent;
				const first = setup.commentData.first();
				if (!first) {
					throw new Error('Expected item to exist');
				}
				setup.commentData.activate(first);

				const toggleLink = doc.createElement('a');
				toggleLink.classList.add('togg', 'clicky');
				toggleLink.textContent = '[–]';
				setup.rows[1]?.appendChild(toggleLink);
				const clickSpy = vi.spyOn(toggleLink, 'click');

				await keyboardHandlers.move(event, setup.commentData, 'down');

				expect(clickSpy).toHaveBeenCalled();
			});
		});

		describe('when moving up', () => {
			it('should move to previous item', async () => {
				const setup = createCommentData(doc, 3);
				const event = { shiftKey: false } as KeyboardEvent;
				const second = setup.commentData.get('comment-2');
				if (!second) {
					throw new Error('Expected item to exist');
				}
				setup.commentData.activate(second);

				await keyboardHandlers.move(event, setup.commentData, 'up');

				expect(setup.commentData.getActiveComment()?.id).toBe('comment-1');
			});

			it('should go back when at first item and next param exists', async () => {
				const setup = createCommentData(doc, 2);
				const event = { shiftKey: false } as KeyboardEvent;
				const first = setup.commentData.first();
				if (!first) {
					throw new Error('Expected item to exist');
				}
				setup.commentData.activate(first);
				const backSpy = vi.spyOn(window.history, 'back');
				vi.spyOn(window, 'location', 'get').mockReturnValue(
					new URL('https://news.ycombinator.com/item?id=1&next=2') as any
				);

				await keyboardHandlers.move(event, setup.commentData, 'up');

				expect(backSpy).toHaveBeenCalled();
				expect(lStorage.setItem).toHaveBeenCalledWith('oj_comment_nav_state', 'prev');
			});

			it('should expand collapsed parent when moving up with shift key', async () => {
				const setup = createCommentData(doc, 3);
				const event = { shiftKey: true } as KeyboardEvent;
				const third = setup.commentData.get('comment-3');
				if (!third) {
					throw new Error('Expected item to exist');
				}

				addIndentation(doc, setup.rows[0], 0);
				addIndentation(doc, setup.rows[1], 1);
				addIndentation(doc, setup.rows[2], 0);
				setup.rows[0]?.classList.add('coll');
				setup.rows[1]?.classList.add('noshow');
				setup.commentData.activate(third);

				const toggleLink = doc.createElement('a');
				toggleLink.classList.add('togg', 'clicky');
				toggleLink.textContent = '[1 more]';
				setup.rows[0]?.appendChild(toggleLink);
				const clickSpy = vi.spyOn(toggleLink, 'click');

				await keyboardHandlers.move(event, setup.commentData, 'up');

				expect(setup.commentData.getActiveComment()?.id).toBe('comment-2');
				expect(clickSpy).toHaveBeenCalled();
			});

			it('should activate immediate previous comment when moving up with shift key', async () => {
				const setup = createCommentData(doc, 4);
				const event = { shiftKey: true } as KeyboardEvent;
				const fourth = setup.commentData.get('comment-4');
				if (!fourth) {
					throw new Error('Expected item to exist');
				}

				addIndentation(doc, setup.rows[0], 0);
				addIndentation(doc, setup.rows[1], 1);
				addIndentation(doc, setup.rows[2], 1);
				addIndentation(doc, setup.rows[3], 0);
				setup.rows[0]?.classList.add('coll');
				setup.rows[1]?.classList.add('noshow');
				setup.rows[2]?.classList.add('noshow');
				setup.commentData.activate(fourth);

				await keyboardHandlers.move(event, setup.commentData, 'up');

				expect(setup.commentData.getActiveComment()?.id).toBe('comment-3');
			});

			it('should expand parent when moving up into a hidden comment with shift key', async () => {
				const setup = createCommentData(doc, 4);
				const event = { shiftKey: true } as KeyboardEvent;
				const fourth = setup.commentData.get('comment-4');
				if (!fourth) {
					throw new Error('Expected item to exist');
				}

				addIndentation(doc, setup.rows[0], 0);
				addIndentation(doc, setup.rows[1], 1);
				addIndentation(doc, setup.rows[2], 1);
				addIndentation(doc, setup.rows[3], 0);
				setup.rows[0]?.classList.add('coll');
				setup.rows[1]?.classList.add('noshow');
				setup.rows[2]?.classList.add('noshow');
				setup.commentData.activate(fourth);

				const toggleLink = doc.createElement('a');
				toggleLink.classList.add('togg', 'clicky');
				toggleLink.textContent = '[2 more]';
				setup.rows[0]?.appendChild(toggleLink);
				const clickSpy = vi.spyOn(toggleLink, 'click');

				await keyboardHandlers.move(event, setup.commentData, 'up');

				expect(clickSpy).toHaveBeenCalled();
				expect(setup.commentData.getActiveComment()?.id).toBe('comment-3');
			});

			it('should expand the nearest collapsed ancestor when moving up into deep hidden child', async () => {
				const setup = createCommentData(doc, 4);
				const event = { shiftKey: true } as KeyboardEvent;
				const fourth = setup.commentData.get('comment-4');
				if (!fourth) {
					throw new Error('Expected item to exist');
				}

				addIndentation(doc, setup.rows[0], 0);
				addIndentation(doc, setup.rows[1], 1);
				addIndentation(doc, setup.rows[2], 2);
				addIndentation(doc, setup.rows[3], 0);
				setup.rows[0]?.classList.add('coll');
				setup.rows[1]?.classList.add('noshow');
				setup.rows[2]?.classList.add('noshow');
				setup.commentData.activate(fourth);

				const toggleLink = doc.createElement('a');
				toggleLink.classList.add('togg', 'clicky');
				toggleLink.textContent = '[2 more]';
				setup.rows[0]?.appendChild(toggleLink);
				const clickSpy = vi.spyOn(toggleLink, 'click');

				await keyboardHandlers.move(event, setup.commentData, 'up');

				expect(clickSpy).toHaveBeenCalled();
				expect(setup.commentData.getActiveComment()?.id).toBe('comment-3');
			});

			it('should scroll to top when reaching first item', async () => {
				const setup = createCommentData(doc, 3);
				const event = { shiftKey: false } as KeyboardEvent;
				const second = setup.commentData.get('comment-2');
				if (!second) {
					throw new Error('Expected item to exist');
				}
				setup.commentData.activate(second);
				vi.spyOn(dom, 'elementInScrollView').mockReturnValue(true);

				await keyboardHandlers.move(event, setup.commentData, 'up');

				expect(setup.commentData.getActiveComment()?.id).toBe('comment-1');
				expect(doc.body.scrollTo).toHaveBeenCalledWith(0, 0);
			});
		});

		describe('scrolling behavior', () => {
			it('should scroll into view when element not in view', async () => {
				const setup = createCommentData(doc, 3);
				const event = { shiftKey: false } as KeyboardEvent;
				const first = setup.commentData.first();
				if (!first) {
					throw new Error('Expected item to exist');
				}
				setup.commentData.activate(first);
				vi.spyOn(dom, 'elementInScrollView').mockReturnValue(false);
				const scrollSpy = vi
					.spyOn(HTMLElement.prototype, 'scrollIntoView')
					.mockImplementation(noop);

				await keyboardHandlers.move(event, setup.commentData, 'down');

				expect(scrollSpy).toHaveBeenCalledWith(true);
			});

			it('should not scroll when element is in view', async () => {
				const setup = createCommentData(doc, 3);
				const event = { shiftKey: false } as KeyboardEvent;
				const first = setup.commentData.first();
				if (!first) {
					throw new Error('Expected item to exist');
				}
				setup.commentData.activate(first);
				vi.spyOn(dom, 'elementInScrollView').mockReturnValue(true);
				const scrollSpy = vi
					.spyOn(HTMLElement.prototype, 'scrollIntoView')
					.mockImplementation(noop);

				await keyboardHandlers.move(event, setup.commentData, 'down');

				expect(scrollSpy).not.toHaveBeenCalled();
			});
		});
	});

	describe('escape', () => {
		it('should remove active item', async () => {
			const setup = createCommentData(doc, 3);
			const first = setup.commentData.first();
			if (!first) {
				throw new Error('Expected item to exist');
			}
			setup.commentData.activate(first);

			await keyboardHandlers.escape(setup.commentData);

			expect(setup.commentData.getActiveComment()).toBeUndefined();
		});

		it('should remove focus class from active item', async () => {
			const setup = createCommentData(doc, 1);
			const first = setup.commentData.first();
			const row = setup.rows[0];
			if (!(first && row)) {
				throw new Error('Expected item to exist');
			}
			const defaultCell = doc.createElement('td');
			defaultCell.classList.add('default');
			row.appendChild(defaultCell);
			setup.commentData.activate(first);

			await keyboardHandlers.escape(setup.commentData);

			expect(row.classList.contains('oj_focused_comment')).toBe(false);
		});

		it('should remove active comment from storage', async () => {
			const setup = createCommentData(doc, 1);
			const first = setup.commentData.first();
			if (!first) {
				throw new Error('Expected item to exist');
			}
			vi.spyOn(dom, 'getItemIdFromLocation').mockReturnValue('123');
			vi.spyOn(lStorage, 'getItem').mockResolvedValue({
				'123': { commentId: 'comment-1' },
				'456': { commentId: 'comment-2' },
			});
			setup.commentData.activate(first);

			await keyboardHandlers.escape(setup.commentData);

			expect(lStorage.setItem).toHaveBeenCalledWith('oj_active_comment_id', {
				'456': { commentId: 'comment-2' },
			});
		});
	});

	describe('activate', () => {
		it('should activate the specified element', async () => {
			const setup = createCommentData(doc, 2);
			const row = setup.rows[1];
			if (!row) {
				throw new Error('Expected item to exist');
			}
			const inner = doc.createElement('span');
			row.appendChild(inner);

			await keyboardHandlers.activateElement(setup.commentData, inner);

			expect(setup.commentData.getActiveComment()?.id).toBe('comment-2');
		});

		it('should store active comment when item id is available', async () => {
			const setup = createCommentData(doc, 1);
			const first = setup.commentData.first();
			if (!first) {
				throw new Error('Expected item to exist');
			}
			vi.spyOn(dom, 'getItemIdFromLocation').mockReturnValue('123');

			await keyboardHandlers.activateComment(setup.commentData, first);

			expect(lStorage.setItem).toHaveBeenCalledWith('oj_active_comment_id', {
				'123': { commentId: 'comment-1' },
			});
		});
	});

	describe('reply', () => {
		it('should click reply button when it exists', () => {
			const setup = createCommentData(doc, 1);
			const row = setup.rows[0];
			const first = setup.commentData.first();
			if (!(row && first)) {
				throw new Error('Expected item to exist');
			}
			const replyBtn = doc.createElement('a');
			replyBtn.href = 'reply?id=123';
			row.appendChild(replyBtn);
			setup.commentData.activate(first);
			const clickSpy = vi.spyOn(replyBtn, 'click');

			keyboardHandlers.reply(setup.commentData);

			expect(clickSpy).toHaveBeenCalled();
		});

		it('should return undefined when no reply button exists', () => {
			const setup = createCommentData(doc, 1);
			const first = setup.commentData.first();
			if (!first) {
				throw new Error('Expected item to exist');
			}
			setup.commentData.activate(first);

			const result = keyboardHandlers.reply(setup.commentData);

			expect(result).toBeUndefined();
		});
	});

	describe('favorite', () => {
		it('should click favorite link when it exists', () => {
			const setup = createCommentData(doc, 1);
			const row = setup.rows[0];
			const first = setup.commentData.first();
			if (!(row && first)) {
				throw new Error('Expected item to exist');
			}
			const faveLink = doc.createElement('button');
			faveLink.classList.add('oj_favorite_link');
			row.appendChild(faveLink);
			setup.commentData.activate(first);
			const clickSpy = vi.spyOn(faveLink, 'click');

			keyboardHandlers.favorite(setup.commentData);

			expect(clickSpy).toHaveBeenCalled();
		});

		it('should not throw when no favorite link exists', () => {
			const setup = createCommentData(doc, 1);
			const first = setup.commentData.first();
			if (!first) {
				throw new Error('Expected item to exist');
			}
			setup.commentData.activate(first);

			expect(() => keyboardHandlers.favorite(setup.commentData)).not.toThrow();
		});
	});

	describe('flag', () => {
		it('should click flag link when it exists', () => {
			const setup = createCommentData(doc, 1);
			const row = setup.rows[0];
			const first = setup.commentData.first();
			if (!(row && first)) {
				throw new Error('Expected item to exist');
			}
			const flagLink = doc.createElement('a');
			flagLink.classList.add('oj_flag_link');
			row.appendChild(flagLink);
			setup.commentData.activate(first);
			const clickSpy = vi.spyOn(flagLink, 'click');

			keyboardHandlers.flag(setup.commentData);

			expect(clickSpy).toHaveBeenCalled();
		});

		it('should not throw when no flag link exists', () => {
			const setup = createCommentData(doc, 1);
			const first = setup.commentData.first();
			if (!first) {
				throw new Error('Expected item to exist');
			}
			setup.commentData.activate(first);

			expect(() => keyboardHandlers.flag(setup.commentData)).not.toThrow();
		});
	});

	describe('collapseToggle', () => {
		it('should click collapse link when it exists', () => {
			const setup = createCommentData(doc, 1);
			const row = setup.rows[0];
			const first = setup.commentData.first();
			if (!(row && first)) {
				throw new Error('Expected item to exist');
			}
			const toggleLink = doc.createElement('a');
			toggleLink.classList.add('togg', 'clicky');
			toggleLink.textContent = '[–]';
			row.appendChild(toggleLink);
			setup.commentData.activate(first);
			const clickSpy = vi.spyOn(toggleLink, 'click');

			keyboardHandlers.collapseToggle(setup.commentData);

			expect(clickSpy).toHaveBeenCalled();
		});

		it('should not throw when no toggle link exists', () => {
			const setup = createCommentData(doc, 1);
			const first = setup.commentData.first();
			if (!first) {
				throw new Error('Expected item to exist');
			}
			setup.commentData.activate(first);

			expect(() => keyboardHandlers.collapseToggle(setup.commentData)).not.toThrow();
		});
	});

	describe('navigateToThreadLink', () => {
		it('should navigate to next link', async () => {
			const setup = createCommentData(doc, 3);
			const row = setup.rows[0];
			const first = setup.commentData.first();
			if (!(row && first)) {
				throw new Error('Expected item to exist');
			}
			const nextLink = doc.createElement('a');
			nextLink.textContent = 'next';
			nextLink.href = '#comment-2';
			row.appendChild(nextLink);
			setup.commentData.activate(first);
			const clickSpy = vi.spyOn(nextLink, 'click');

			await keyboardHandlers.navigateToThreadLink(setup.commentData, 'next');

			expect(clickSpy).toHaveBeenCalled();
			expect(setup.commentData.getActiveComment()?.id).toBe('comment-2');
		});

		it('should navigate to prev link', async () => {
			const setup = createCommentData(doc, 3);
			const row = setup.rows[1];
			const second = setup.commentData.get('comment-2');
			if (!(row && second)) {
				throw new Error('Expected item to exist');
			}
			const prevLink = doc.createElement('a');
			prevLink.textContent = 'prev';
			prevLink.href = '#comment-1';
			row.appendChild(prevLink);
			setup.commentData.activate(second);
			const clickSpy = vi.spyOn(prevLink, 'click');

			await keyboardHandlers.navigateToThreadLink(setup.commentData, 'prev');

			expect(clickSpy).toHaveBeenCalled();
			expect(setup.commentData.getActiveComment()?.id).toBe('comment-1');
		});

		it('should not throw when link does not exist', async () => {
			const setup = createCommentData(doc, 3);
			const first = setup.commentData.first();
			if (!first) {
				throw new Error('Expected item to exist');
			}
			setup.commentData.activate(first);

			await expect(
				keyboardHandlers.navigateToThreadLink(setup.commentData, 'next')
			).resolves.toBeUndefined();
		});
	});

	describe('next', () => {
		it('should call navigateToThreadLink with next', async () => {
			const setup = createCommentData(doc, 3);
			const spy = vi.spyOn(keyboardHandlers, 'navigateToThreadLink');

			await keyboardHandlers.next(setup.commentData);

			expect(spy).toHaveBeenCalledWith(setup.commentData, 'next');
		});
	});

	describe('previous', () => {
		it('should call navigateToThreadLink with prev', async () => {
			const setup = createCommentData(doc, 3);
			const spy = vi.spyOn(keyboardHandlers, 'navigateToThreadLink');

			await keyboardHandlers.previous(setup.commentData);

			expect(spy).toHaveBeenCalledWith(setup.commentData, 'prev');
		});
	});

	describe('votes', () => {
		it('should click upvote button when no unvote exists', () => {
			const setup = createCommentData(doc, 1);
			const row = setup.rows[0];
			const first = setup.commentData.first();
			if (!(row && first)) {
				throw new Error('Expected item to exist');
			}
			const upvoteBtn = doc.createElement('div');
			upvoteBtn.classList.add('votearrow');
			upvoteBtn.title = 'upvote';
			row.appendChild(upvoteBtn);
			setup.commentData.activate(first);
			const clickSpy = vi.spyOn(upvoteBtn, 'click');

			keyboardHandlers.upvote(setup.commentData);

			expect(clickSpy).toHaveBeenCalled();
		});

		it('should click downvote button when no unvote exists', () => {
			const setup = createCommentData(doc, 1);
			const row = setup.rows[0];
			const first = setup.commentData.first();
			if (!(row && first)) {
				throw new Error('Expected item to exist');
			}
			const downvoteBtn = doc.createElement('div');
			downvoteBtn.classList.add('votearrow');
			downvoteBtn.title = 'downvote';
			row.appendChild(downvoteBtn);
			setup.commentData.activate(first);
			const clickSpy = vi.spyOn(downvoteBtn, 'click');

			keyboardHandlers.downvote(setup.commentData);

			expect(clickSpy).toHaveBeenCalled();
		});

		it('should click unvote button when it exists', () => {
			const setup = createCommentData(doc, 1);
			const row = setup.rows[0];
			const first = setup.commentData.first();
			if (!(row && first)) {
				throw new Error('Expected item to exist');
			}
			const unvoteBtn = doc.createElement('a');
			unvoteBtn.id = 'un_123';
			row.appendChild(unvoteBtn);
			setup.commentData.activate(first);
			const clickSpy = vi.spyOn(unvoteBtn, 'click');

			keyboardHandlers.upvote(setup.commentData);

			expect(clickSpy).toHaveBeenCalled();
		});

		it('should not throw when no active item', () => {
			const setup = createCommentData(doc, 1);

			expect(() => keyboardHandlers.upvote(setup.commentData)).not.toThrow();
		});
	});

	describe('openReferenceLink', () => {
		it('should open the referenced link when available', async () => {
			const setup = createCommentData(doc, 1);
			const row = setup.rows[0];
			const first = setup.commentData.first();
			if (!(row && first)) {
				throw new Error('Expected item to exist');
			}
			const commtext = doc.createElement('span');
			commtext.classList.add('commtext');
			row.appendChild(commtext);
			setup.commentData.activate(first);
			const createTab = vi.fn(() => Promise.resolve());
			vi.mocked(createClientServices).mockReturnValue({
				getBrowserTabService: () => ({ createTab }),
			} as unknown as ReturnType<typeof createClientServices>);

			vi.mocked(parseReferenceLinks).mockReturnValue([
				{ index: 1, href: 'https://example.com' },
			]);

			await keyboardHandlers.openReferenceLink(
				{
					key: '1',
					ctrlKey: false,
					metaKey: false,
					shiftKey: false,
					altKey: false,
				} as KeyboardEvent,
				setup.commentData
			);

			expect(createTab).toHaveBeenCalledWith({
				url: 'https://example.com',
				active: false,
			});
		});
	});

	describe('checkActiveState', () => {
		it('should activate first comment after pagination navigation', async () => {
			const setup = createCommentData(doc, 2);
			vi.spyOn(dom, 'getItemIdFromLocation').mockReturnValue(null);
			vi.spyOn(lStorage, 'getItem').mockResolvedValueOnce('next');

			await keyboardHandlers.checkActiveState(setup.commentData);

			expect(setup.commentData.getActiveComment()?.id).toBe('comment-1');
			expect(lStorage.setItem).toHaveBeenCalledWith('oj_comment_nav_state', null);
		});

		it('should activate last comment after back navigation', async () => {
			const setup = createCommentData(doc, 3);
			vi.spyOn(dom, 'getItemIdFromLocation').mockReturnValue(null);
			vi.spyOn(lStorage, 'getItem').mockResolvedValueOnce('prev');

			await keyboardHandlers.checkActiveState(setup.commentData);

			expect(setup.commentData.getActiveComment()?.id).toBe('comment-3');
			expect(lStorage.setItem).toHaveBeenCalledWith('oj_comment_nav_state', null);
		});

		it('should activate last collapsed comment after back navigation', async () => {
			const setup = createCommentData(doc, 3);
			setup.rows[2]?.classList.add('coll');
			vi.spyOn(dom, 'getItemIdFromLocation').mockReturnValue(null);
			vi.spyOn(lStorage, 'getItem').mockResolvedValueOnce('prev');

			await keyboardHandlers.checkActiveState(setup.commentData);

			expect(setup.commentData.getActiveComment()?.id).toBe('comment-3');
			expect(lStorage.setItem).toHaveBeenCalledWith('oj_comment_nav_state', null);
		});

		it('should skip noshow comment when activating last comment after back navigation', async () => {
			const setup = createCommentData(doc, 3);
			setup.rows[2]?.classList.add('noshow');
			vi.spyOn(dom, 'getItemIdFromLocation').mockReturnValue(null);
			vi.spyOn(lStorage, 'getItem').mockResolvedValueOnce('prev');

			await keyboardHandlers.checkActiveState(setup.commentData);

			expect(setup.commentData.getActiveComment()?.id).toBe('comment-2');
			expect(lStorage.setItem).toHaveBeenCalledWith('oj_comment_nav_state', null);
		});

		it('should skip dead comment when activating last comment after back navigation', async () => {
			const setup = createCommentData(doc, 3);
			const deadRow = setup.rows[2];
			if (!deadRow) {
				throw new Error('Expected item to exist');
			}
			const comhead = doc.createElement('span');
			comhead.classList.add('comhead');
			const dead = doc.createElement('span');
			dead.classList.add('dead');
			comhead.appendChild(dead);
			deadRow.appendChild(comhead);

			vi.spyOn(dom, 'getItemIdFromLocation').mockReturnValue(null);
			vi.spyOn(lStorage, 'getItem').mockResolvedValueOnce('prev');

			await keyboardHandlers.checkActiveState(setup.commentData);

			expect(setup.commentData.getActiveComment()?.id).toBe('comment-2');
			expect(lStorage.setItem).toHaveBeenCalledWith('oj_comment_nav_state', null);
		});

		it('should activate stored comment when item id is available', async () => {
			const setup = createCommentData(doc, 2);
			vi.spyOn(dom, 'getItemIdFromLocation').mockReturnValue('123');
			vi.spyOn(lStorage, 'getItem')
				.mockResolvedValueOnce(null)
				.mockResolvedValueOnce({
					'123': { commentId: 'comment-2' },
				});

			await keyboardHandlers.checkActiveState(setup.commentData);

			expect(setup.commentData.getActiveComment()?.id).toBe('comment-2');
		});

		it('should not activate when item id is missing', async () => {
			const setup = createCommentData(doc, 2);
			vi.spyOn(dom, 'getItemIdFromLocation').mockReturnValue(null);

			await keyboardHandlers.checkActiveState(setup.commentData);

			expect(setup.commentData.getActiveComment()).toBeUndefined();
		});
	});
});
