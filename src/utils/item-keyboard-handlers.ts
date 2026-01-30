import { createServicesManager } from '@/services/manager.ts';
import { dom, isComboKey } from '@/utils/dom';
import { activateItem, focusClass, type ItemData } from '@/utils/dom-item-data.ts';
import { parseReferenceLinks } from '@/utils/parse-reference-links.ts';

const regexMore = /\[\s*\d+\s*more\s*]/;

const VOTE_SELECTORS = {
	UNVOTE_LINK: 'a[id^="un_"]',
	UPVOTE_ARROW: 'div.votearrow[title="upvote"]',
	DOWNVOTE_ARROW: 'div.votearrow[title="downvote"]',
} as const;

export const itemKeyboardHandlers = {
	// Move up or down
	move(event: KeyboardEvent, itemData: ItemData, direction: 'up' | 'down') {
		const skipHidden = !event.shiftKey;

		if (!itemData.activeItem) {
			this.activateFirstItem(itemData, skipHidden);
			return;
		}

		const nextItem = this.getNextItem(itemData, direction, skipHidden);
		if (!nextItem) {
			return;
		}

		activateItem(itemData, nextItem);

		if (!skipHidden) {
			this.handleCollapsedToggle(itemData, direction);
		}

		this.handleScrolling(itemData, nextItem, direction);
	},

	activateFirstItem(itemData: ItemData, skipHidden: boolean) {
		const first = itemData.first();
		if (!first) {
			return;
		}

		const itemToActivate =
			first.classList.contains('coll') && skipHidden
				? itemData.getNextElement(first.id, skipHidden)
				: first;

		if (itemToActivate) {
			activateItem(itemData, itemToActivate);
		}
	},

	getNextItem(itemData: ItemData, direction: 'up' | 'down', skipHidden: boolean) {
		if (!itemData.activeItem) {
			return undefined;
		}

		return direction === 'down'
			? itemData.getNextElement(itemData.activeItem.id, skipHidden)
			: itemData.getPreviousElement(itemData.activeItem.id, skipHidden);
	},

	handleCollapsedToggle(itemData: ItemData, direction: 'up' | 'down') {
		const closest =
			direction === 'up' ? itemData.closestCollapsedUp() : itemData.closestCollapsedDown();

		if (closest) {
			this.collapseToggle(closest);
		}
	},

	handleScrolling(itemData: ItemData, nextItem: HTMLElement, direction: 'up' | 'down') {
		if (!dom.elementInScrollView(nextItem) && itemData.activeItem) {
			itemData.activeItem.scrollIntoView(true);
		}

		if (direction === 'up' && nextItem === itemData.first()) {
			document.body.scrollTo(0, 0);
		}
	},

	// De-activate item
	escape(itemData: ItemData) {
		(document.activeElement as HTMLElement)?.blur();

		if (itemData.activeItem) {
			itemData.activeItem.classList.remove(focusClass);
			itemData.activeItem = undefined;
		}
	},

	// De-activate item
	activate(itemData: ItemData, toActivate: HTMLElement) {
		activateItem(itemData, toActivate);
	},

	// Open reference links
	openReferenceLink(
		event: KeyboardEvent,
		activeItem: HTMLElement,
		_openReferenceLinksInNewTab?: boolean
	) {
		const targetIndex = event.keyCode - 48;
		const commtext = activeItem.querySelector('.commtext') as HTMLElement;
		if (!commtext) {
			return Promise.resolve();
		}
		const links = parseReferenceLinks(commtext);

		const link = links.find((obj) => obj.index === targetIndex);
		if (!link) {
			return Promise.resolve();
		}

		return createServicesManager()
			.getBrowserTabServiceService()
			.createTab({ url: link.href, active: isComboKey(event) });
	},

	reply(itemData: ItemData) {
		const replyBtn = itemData.activeItem?.querySelector(
			'a[href^="reply"]'
		) as HTMLAnchorElement;
		if (replyBtn) {
			replyBtn.click();
			return replyBtn;
		}
	},

	favorite(itemData: ItemData) {
		const fave = itemData.activeItem?.querySelector('.oj_favorite_link') as HTMLAnchorElement;
		if (fave) {
			fave.click();
		}
	},

	flag(itemData: ItemData) {
		const flag = itemData.activeItem?.querySelector('.oj_flag_link') as HTMLAnchorElement;
		if (flag) {
			flag.click();
		}
	},

	collapseToggle(theItem: HTMLElement) {
		let collapsed = false;
		const el = [...theItem.querySelectorAll('a.togg.clicky')].find((a) => {
			const trimmed = a.textContent.trim();
			collapsed = regexMore.test(trimmed);
			return trimmed === '[–]' || collapsed;
		}) as HTMLAnchorElement;
		if (el) {
			el.click();
			return el;
		}
	},

	navigateToThreadLink(itemData: ItemData, linkText: 'next' | 'prev') {
		if (itemData.activeItem) {
			const link = [...itemData.activeItem.querySelectorAll('a')].find(
				(a) => a.textContent.trim() === linkText
			);
			if (link) {
				link.click();
				const toActivate = itemData.get(link.href.split('#')[1]);
				if (toActivate) {
					activateItem(itemData, toActivate);
				}
			}
		}
	},

	next(itemData: ItemData) {
		this.navigateToThreadLink(itemData, 'next');
	},

	previous(itemData: ItemData) {
		this.navigateToThreadLink(itemData, 'prev');
	},

	handleVote(itemData: ItemData, voteType: 'upvote' | 'downvote') {
		const activeItem = itemData.activeItem;
		if (!activeItem) {
			return;
		}

		const voteBtn = activeItem.querySelector(
			voteType === 'upvote' ? VOTE_SELECTORS.UPVOTE_ARROW : VOTE_SELECTORS.DOWNVOTE_ARROW
		) as HTMLDivElement;
		const unvoteBtn = activeItem.querySelector(VOTE_SELECTORS.UNVOTE_LINK) as HTMLAnchorElement;

		if (unvoteBtn) {
			unvoteBtn.click();
		} else if (voteBtn) {
			voteBtn.click();
		}
	},

	upvote(itemData: ItemData) {
		this.handleVote(itemData, 'upvote');
	},

	downvote(itemData: ItemData) {
		this.handleVote(itemData, 'downvote');
	},
};
