import { dom } from '@/utils/dom';
import { parseReferenceLinks } from '@/utils/parse-reference-links.ts';
import type { ItemData } from '@/utils/types.ts';

const focusClass = 'oj_focused_item';

export function activateItem(itemData: ItemData) {
	itemData.activeItem = itemData.items[itemData.index];
	itemData.activeItem.classList.add(focusClass);
}

function getNextCommentWithSameIndent(itemData: ItemData, direction: number) {
	let { items, index, activeItem } = itemData;
	if (!activeItem) {
		return index;
	}

	if (activeItem?.matches('a.morelink')) {
		return index;
	}

	const activeItemIndentation = dom.getCommentIndentation(activeItem);
	if (!activeItemIndentation.width) {
		return index;
	}

	let nextItemIndent: number | undefined;
	do {
		if (index === (direction === 1 ? items.length - 1 : 0)) {
			return index;
		}

		index += direction;

		// If index is the 'More' link, then make it undefined
		nextItemIndent =
			index === items.length - 1 ? undefined : dom.getCommentIndentation(items[index]).width;
	} while (nextItemIndent && nextItemIndent > activeItemIndentation.width);

	return index;
}

export const itemKeyboardHandlers = {
	// Move down
	down(itemData: ItemData, event: KeyboardEvent) {
		if (itemData.index === itemData.items.length - 1) {
			activateItem(itemData);
			return;
		}

		itemData.items[itemData.index].classList.remove(focusClass);

		if (itemData.activeItem) {
			if (event.shiftKey) {
				if (itemData.commentList) {
					itemData.index = getNextCommentWithSameIndent(itemData, 1);
				} else {
					itemData.index = itemData.items.length - 1;
				}
			} else {
				itemData.index++;
			}
		}

		activateItem(itemData);

		if (itemData.activeItem && !dom.elementInScrollView(itemData.activeItem)) {
			itemData.activeItem?.scrollIntoView(true);
		}
	},

	// Move up
	up(itemData: ItemData, event: KeyboardEvent) {
		if (itemData.index === 0) {
			document.body.scrollTop = 0;
			return;
		}

		itemData.items[itemData.index].classList.remove(focusClass);

		if (itemData.activeItem) {
			if (event.shiftKey) {
				if (itemData.commentList) {
					itemData.index = getNextCommentWithSameIndent(itemData, -1);
				} else {
					itemData.index = 0;
				}
			} else {
				itemData.index--;
			}
		}

		activateItem(itemData);

		if (itemData.activeItem && !dom.elementInScrollView(itemData.activeItem)) {
			itemData.activeItem?.scrollIntoView(true);
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

	// Open reference links
	openReferenceLink(
		event: KeyboardEvent,
		activeItem: HTMLElement,
		_openReferenceLinksInNewTab: boolean
	) {
		const targetIndex = event.keyCode - 48;
		const links = parseReferenceLinks(activeItem);

		const link = links.find((obj) => obj.index === targetIndex);
		if (!link) {
			return;
		}

		// TODO: make this a proxy service
		// if (openReferenceLinksInNewTab || event.shiftKey) {
		// 	browser.runtime.sendMessage({
		// 		url: link.href,
		// 		active: !event.shiftKey,
		// 	});
		// } else {
		// 	window.open(link.href, '_self');
		// }
	},
};
