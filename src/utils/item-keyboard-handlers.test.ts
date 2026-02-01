import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dom } from '@/utils/dom.ts';
import { ItemData } from '@/utils/dom-item-data.ts';
import { itemKeyboardHandlers } from '@/utils/item-keyboard-handlers.ts';

vi.mock('@/services/manager.ts', () => ({
	createServicesManager: vi.fn(() => ({
		getBrowserTabServiceService: vi.fn(() => ({
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

describe('itemKeyboardHandlers', () => {
	const createTestItemData = (count: number) => {
		const elements = new Map<string, HTMLElement>();
		for (let i = 1; i <= count; i++) {
			const el = document.createElement('tr');
			el.id = `item-${i}`;
			el.classList.add('tr.comtr');
			elements.set(el.id, el);
		}
		return new ItemData(elements);
	};

	beforeEach(() => {
		vi.clearAllMocks();
		document.body.innerHTML = '';
		vi.spyOn(document.body, 'scrollTo').mockImplementation(noop);
	});

	describe('move', () => {
		describe('when no active item', () => {
			it('should activate first item', () => {
				const itemData = createTestItemData(3);
				const event = { shiftKey: false } as KeyboardEvent;

				itemKeyboardHandlers.move(event, itemData, 'down');

				expect(itemData.activeItem).toBe(itemData.first());
			});

			it('should skip collapsed first item when skipHidden is true', () => {
				const itemData = createTestItemData(3);
				const first = itemData.first();
				first?.classList.add('coll');
				const event = { shiftKey: false } as KeyboardEvent;

				itemKeyboardHandlers.move(event, itemData, 'down');

				expect(itemData.activeItem).not.toBe(first);
				expect(itemData.activeItem?.id).toBe('item-2');
			});

			it('should not skip collapsed first item when skipHidden is false', () => {
				const itemData = createTestItemData(3);
				const first = itemData.first();
				first?.classList.add('coll');
				const event = { shiftKey: true } as KeyboardEvent;

				itemKeyboardHandlers.move(event, itemData, 'down');

				expect(itemData.activeItem).toBe(first);
			});
		});

		describe('when moving down', () => {
			it('should move to next item', () => {
				const itemData = createTestItemData(3);
				itemData.activeItem = itemData.first();
				const event = { shiftKey: false } as KeyboardEvent;

				itemKeyboardHandlers.move(event, itemData, 'down');

				expect(itemData.activeItem?.id).toBe('item-2');
			});

			it('should not move when already at last item', () => {
				const itemData = createTestItemData(3);
				const last = itemData.last();
				itemData.activeItem = last;
				const event = { shiftKey: false } as KeyboardEvent;

				itemKeyboardHandlers.move(event, itemData, 'down');

				expect(itemData.activeItem).toBe(last);
			});

			it('should toggle collapsed item when shift key is held', () => {
				const itemData = createTestItemData(3);
				itemData.activeItem = itemData.first();
				const second = itemData.get('item-2');
				second?.classList.add('coll');
				const toggleLink = document.createElement('a');
				toggleLink.classList.add('togg', 'clicky');
				toggleLink.textContent = '[–]';
				second?.appendChild(toggleLink);
				const clickSpy = vi.spyOn(toggleLink, 'click');
				const event = { shiftKey: true } as KeyboardEvent;

				itemKeyboardHandlers.move(event, itemData, 'down');

				expect(clickSpy).toHaveBeenCalled();
			});
		});

		describe('when moving up', () => {
			it('should move to previous item', () => {
				const itemData = createTestItemData(3);
				itemData.activeItem = itemData.get('item-2');
				const event = { shiftKey: false } as KeyboardEvent;

				itemKeyboardHandlers.move(event, itemData, 'up');

				expect(itemData.activeItem?.id).toBe('item-1');
			});

			it('should scroll to top when reaching first item', () => {
				const itemData = createTestItemData(3);
				const first = itemData.first();
				itemData.activeItem = itemData.get('item-2');
				const event = { shiftKey: false } as KeyboardEvent;
				vi.spyOn(dom, 'elementInScrollView').mockReturnValue(true);

				itemKeyboardHandlers.move(event, itemData, 'up');

				expect(itemData.activeItem).toBe(first);
				expect(document.body.scrollTo).toHaveBeenCalledWith(0, 0);
			});
		});

		describe('scrolling behavior', () => {
			it('should scroll into view when element not in view', () => {
				const itemData = createTestItemData(3);
				itemData.activeItem = itemData.first();
				const event = { shiftKey: false } as KeyboardEvent;
				vi.spyOn(dom, 'elementInScrollView').mockReturnValue(false);
				const scrollSpy = vi
					.spyOn(HTMLElement.prototype, 'scrollIntoView')
					.mockImplementation(noop);

				itemKeyboardHandlers.move(event, itemData, 'down');

				expect(scrollSpy).toHaveBeenCalledWith(true);
			});

			it('should not scroll when element is in view', () => {
				const itemData = createTestItemData(3);
				itemData.activeItem = itemData.first();
				const event = { shiftKey: false } as KeyboardEvent;
				vi.spyOn(dom, 'elementInScrollView').mockReturnValue(true);
				const scrollSpy = vi
					.spyOn(HTMLElement.prototype, 'scrollIntoView')
					.mockImplementation(noop);

				itemKeyboardHandlers.move(event, itemData, 'down');

				expect(scrollSpy).not.toHaveBeenCalled();
			});
		});
	});

	describe('escape', () => {
		it('should remove active item', () => {
			const itemData = createTestItemData(3);
			itemData.activeItem = itemData.first();

			itemKeyboardHandlers.escape(itemData);

			expect(itemData.activeItem).toBeUndefined();
		});

		it('should remove focus class from active item', () => {
			const itemData = createTestItemData(3);
			const first = itemData.first();
			itemData.activeItem = first;
			first?.classList.add('oj_focused_item');

			itemKeyboardHandlers.escape(itemData);

			expect(first?.classList.contains('oj_focused_item')).toBe(false);
		});
	});

	describe('activate', () => {
		it('should activate the specified item', () => {
			const itemData = createTestItemData(3);
			const second = itemData.get('item-2');

			if (second) {
				itemKeyboardHandlers.activate(itemData, second);
			}

			expect(itemData.activeItem).toBe(second);
		});
	});

	describe('reply', () => {
		it('should click reply button when it exists', () => {
			const itemData = createTestItemData(1);
			const item = itemData.first();
			if (!item) {
				throw new Error('Expected item to exist');
			}
			const replyBtn = document.createElement('a');
			replyBtn.href = 'reply?id=123';
			item.appendChild(replyBtn);
			itemData.activeItem = item;
			const clickSpy = vi.spyOn(replyBtn, 'click');

			itemKeyboardHandlers.reply(itemData);

			expect(clickSpy).toHaveBeenCalled();
		});

		it('should return undefined when no reply button exists', () => {
			const itemData = createTestItemData(1);
			itemData.activeItem = itemData.first();

			const result = itemKeyboardHandlers.reply(itemData);

			expect(result).toBeUndefined();
		});
	});

	describe('favorite', () => {
		it('should click favorite link when it exists', () => {
			const itemData = createTestItemData(1);
			const item = itemData.first();
			if (!item) {
				throw new Error('Expected item to exist');
			}
			const faveLink = document.createElement('a');
			faveLink.classList.add('oj_favorite_link');
			item.appendChild(faveLink);
			itemData.activeItem = item;
			const clickSpy = vi.spyOn(faveLink, 'click');

			itemKeyboardHandlers.favorite(itemData);

			expect(clickSpy).toHaveBeenCalled();
		});

		it('should not throw when no favorite link exists', () => {
			const itemData = createTestItemData(1);
			itemData.activeItem = itemData.first();

			expect(() => itemKeyboardHandlers.favorite(itemData)).not.toThrow();
		});
	});

	describe('flag', () => {
		it('should click flag link when it exists', () => {
			const itemData = createTestItemData(1);
			const item = itemData.first();
			if (!item) {
				throw new Error('Expected item to exist');
			}
			const flagLink = document.createElement('a');
			flagLink.classList.add('oj_flag_link');
			item.appendChild(flagLink);
			itemData.activeItem = item;
			const clickSpy = vi.spyOn(flagLink, 'click');

			itemKeyboardHandlers.flag(itemData);

			expect(clickSpy).toHaveBeenCalled();
		});

		it('should not throw when no flag link exists', () => {
			const itemData = createTestItemData(1);
			itemData.activeItem = itemData.first();

			expect(() => itemKeyboardHandlers.flag(itemData)).not.toThrow();
		});
	});

	describe('collapseToggle', () => {
		const testCases = [
			{
				name: 'should click collapse link with [–] text',
				linkText: '[–]',
				shouldClick: true,
			},
			{
				name: 'should click collapse link with [X more] text',
				linkText: '[2 more]',
				shouldClick: true,
			},
			{
				name: 'should not click when no toggle link exists',
				linkText: null,
				shouldClick: false,
			},
		];

		for (const { name, linkText, shouldClick } of testCases) {
			it(name, () => {
				const item = document.createElement('div');
				let clickSpy: (() => void) | undefined;

				if (linkText) {
					const toggleLink = document.createElement('a');
					toggleLink.classList.add('togg', 'clicky');
					toggleLink.textContent = linkText;
					item.appendChild(toggleLink);
					clickSpy = vi.spyOn(toggleLink, 'click');
				}

				const result = itemKeyboardHandlers.collapseToggle(item);

				if (shouldClick && clickSpy) {
					expect(clickSpy).toHaveBeenCalled();
					expect(result).toBeInstanceOf(HTMLAnchorElement);
				} else {
					expect(result).toBeUndefined();
				}
			});
		}
	});

	describe('navigateToThreadLink', () => {
		it('should navigate to next link', () => {
			const itemData = createTestItemData(3);
			const item = itemData.first();
			if (!item) {
				throw new Error('Expected item to exist');
			}
			const nextLink = document.createElement('a');
			nextLink.textContent = 'next';
			nextLink.href = '#item-2';
			item.appendChild(nextLink);
			itemData.activeItem = item;
			const clickSpy = vi.spyOn(nextLink, 'click');

			itemKeyboardHandlers.navigateToThreadLink(itemData, 'next');

			expect(clickSpy).toHaveBeenCalled();
			expect(itemData.activeItem?.id).toBe('item-2');
		});

		it('should navigate to prev link', () => {
			const itemData = createTestItemData(3);
			const item = itemData.get('item-2');
			if (!item) {
				throw new Error('Expected item to exist');
			}
			const prevLink = document.createElement('a');
			prevLink.textContent = 'prev';
			prevLink.href = '#item-1';
			item.appendChild(prevLink);
			itemData.activeItem = item;
			const clickSpy = vi.spyOn(prevLink, 'click');

			itemKeyboardHandlers.navigateToThreadLink(itemData, 'prev');

			expect(clickSpy).toHaveBeenCalled();
			expect(itemData.activeItem?.id).toBe('item-1');
		});

		it('should not throw when link does not exist', () => {
			const itemData = createTestItemData(3);
			itemData.activeItem = itemData.first();

			expect(() => itemKeyboardHandlers.navigateToThreadLink(itemData, 'next')).not.toThrow();
		});
	});

	describe('next', () => {
		it('should call navigateToThreadLink with next', () => {
			const itemData = createTestItemData(3);
			const spy = vi.spyOn(itemKeyboardHandlers, 'navigateToThreadLink');

			itemKeyboardHandlers.next(itemData);

			expect(spy).toHaveBeenCalledWith(itemData, 'next');
		});
	});

	describe('previous', () => {
		it('should call navigateToThreadLink with prev', () => {
			const itemData = createTestItemData(3);
			const spy = vi.spyOn(itemKeyboardHandlers, 'navigateToThreadLink');

			itemKeyboardHandlers.previous(itemData);

			expect(spy).toHaveBeenCalledWith(itemData, 'prev');
		});
	});

	describe('handleVote', () => {
		it('should click upvote button when no unvote exists', () => {
			const itemData = createTestItemData(1);
			const item = itemData.first();
			if (!item) {
				throw new Error('Expected item to exist');
			}
			const upvoteBtn = document.createElement('div');
			upvoteBtn.classList.add('votearrow');
			upvoteBtn.title = 'upvote';
			item.appendChild(upvoteBtn);
			itemData.activeItem = item;
			const clickSpy = vi.spyOn(upvoteBtn, 'click');

			itemKeyboardHandlers.handleVote(itemData, 'upvote');

			expect(clickSpy).toHaveBeenCalled();
		});

		it('should click downvote button when no unvote exists', () => {
			const itemData = createTestItemData(1);
			const item = itemData.first();
			if (!item) {
				throw new Error('Expected item to exist');
			}
			const downvoteBtn = document.createElement('div');
			downvoteBtn.classList.add('votearrow');
			downvoteBtn.title = 'downvote';
			item.appendChild(downvoteBtn);
			itemData.activeItem = item;
			const clickSpy = vi.spyOn(downvoteBtn, 'click');

			itemKeyboardHandlers.handleVote(itemData, 'downvote');

			expect(clickSpy).toHaveBeenCalled();
		});

		it('should click unvote button when it exists', () => {
			const itemData = createTestItemData(1);
			const item = itemData.first();
			if (!item) {
				throw new Error('Expected item to exist');
			}
			const unvoteBtn = document.createElement('a');
			unvoteBtn.id = 'un_123';
			item.appendChild(unvoteBtn);
			itemData.activeItem = item;
			const clickSpy = vi.spyOn(unvoteBtn, 'click');

			itemKeyboardHandlers.handleVote(itemData, 'upvote');

			expect(clickSpy).toHaveBeenCalled();
		});

		it('should not throw when no active item', () => {
			const itemData = createTestItemData(1);

			expect(() => itemKeyboardHandlers.handleVote(itemData, 'upvote')).not.toThrow();
		});
	});

	describe('upvote', () => {
		it('should call handleVote with upvote', () => {
			const itemData = createTestItemData(3);
			const spy = vi.spyOn(itemKeyboardHandlers, 'handleVote');

			itemKeyboardHandlers.upvote(itemData);

			expect(spy).toHaveBeenCalledWith(itemData, 'upvote');
		});
	});

	describe('downvote', () => {
		it('should call handleVote with downvote', () => {
			const itemData = createTestItemData(3);
			const spy = vi.spyOn(itemKeyboardHandlers, 'handleVote');

			itemKeyboardHandlers.downvote(itemData);

			expect(spy).toHaveBeenCalledWith(itemData, 'downvote');
		});
	});
});
