import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import { getKeyboardShortcutsHelp } from '@/components/comment/keyboard-shortcuts-help.ts';
import { showModal } from '@/components/common/modal.ts';
import { dom } from '@/utils/dom.ts';
import { ItemData } from '@/utils/dom-item-data.ts';
import { itemKeyboardHandlers } from '@/utils/item-keyboard-handlers.ts';

// TODO: persist the state of where we are for each comment in each story so that when you reload the page, the
// comment comes back as selected.
export const keyboardNavigation = (
	doc: Document,
	comments: HTMLElement[],
	ctx: ContentScriptContext
): void => {
	const style = doc.createElement('style');
	style.textContent = `
		.oj_focused_item .default {
			outline: 3px solid #f7694c73;
			padding: 5px;
			background-color: white;
		}
		
		.oj_focused_item.morelink {
			margin: 0;
		}
	`;
	doc.head.appendChild(style);

	function prevent(doc: Document) {
		if (doc.activeElement?.tagName === undefined) {
			return true;
		}

		if (doc.activeElement.tagName === 'TEXTAREA') {
			// Allow keyboard navigation if the textarea is a reply textarea
			const textarea = doc.activeElement as HTMLTextAreaElement;
			if (textarea.closest('tr')?.querySelector('textarea') === textarea) {
				return false;
			}
			return true;
		}

		if (doc.activeElement.tagName === 'INPUT') {
			return true;
		}

		if (doc.activeElement.tagName === 'A') {
			(doc.activeElement as HTMLAnchorElement).blur();
			return false;
		}
		return false;
	}

	const itemData: ItemData = new ItemData(dom.mapCommentsById(comments));
	let helpModalOpen = false;

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: it is just complex
	const keydownHandler = (e: KeyboardEvent) => {
		if (prevent(doc)) {
			return;
		}

		const combo = dom.isComboKey(e);

		switch (e.key) {
			// j: Go down
			case 'J':
			case 'j':
				itemKeyboardHandlers.move(e, itemData, 'down');
				break;
			// k: Go up
			case 'K':
			case 'k':
				itemKeyboardHandlers.move(e, itemData, 'up');
				break;
			// Escape
			case 'Escape':
			case 'escape':
				if (!combo) {
					// special case when reply is open
					if (itemData.reply) {
						itemData.reply.click();
						itemData.reply = undefined;
					} else {
						itemKeyboardHandlers.escape(itemData);
					}
				}
				break;
			// reply toggle
			case 'r':
				if (!combo && itemData.activeItem) {
					// store off reply so that it can be used in escape. if the reply box
					// is open, we only want to close it on escape, not unfocus the comment
					itemData.reply = itemKeyboardHandlers.reply(itemData);
				}
				break;
			// favorite toggle
			case 'f':
				if (!combo && itemData.activeItem) {
					itemKeyboardHandlers.favorite(itemData);
				}
				break;
			// flag toggle
			case 'X':
				if (combo && itemData.activeItem) {
					itemKeyboardHandlers.flag(itemData);
				}
				break;
			case 'n':
				if (!combo && itemData.activeItem) {
					itemKeyboardHandlers.next(itemData);
				}
				break;
			case 'p':
				if (!combo && itemData.activeItem) {
					itemKeyboardHandlers.previous(itemData);
				}
				break;
			case 'u':
				if (!combo && itemData.activeItem) {
					itemKeyboardHandlers.upvote(itemData);
				}
				break;
			case 'd':
				if (!combo && itemData.activeItem) {
					itemKeyboardHandlers.downvote(itemData);
				}
				break;
			case 'c':
				if (!combo && itemData.activeItem) {
					itemKeyboardHandlers.collapseToggle(itemData.activeItem);
				}
				break;
			case 't':
				doc.body.scrollTo(0, 0);
				break;
			case '?':
				if (combo && !helpModalOpen) {
					helpModalOpen = true;
					showModal({
						doc,
						ctx,
						content: getKeyboardShortcutsHelp(),
						onClose: () => {
							helpModalOpen = false;
						},
					});
				}
				break;
			// parse reference links
			case '0':
			case '1':
			case '2':
			case '3':
			case '4':
			case '5':
			case '6':
			case '7':
			case '8':
			case '9':
				if (itemData.activeItem) {
					return itemKeyboardHandlers.openReferenceLink(e, itemData.activeItem);
				}
				break;
			default:
				break;
		}
	};

	window.addEventListener('keydown', keydownHandler);

	const itemClickHandler = (e: PointerEvent) => {
		if (e.target instanceof HTMLElement) {
			if (prevent(doc)) {
				return;
			}
			itemKeyboardHandlers.activate(itemData, e.target);
		}
	};

	for (const comment of comments) {
		comment.addEventListener('click', itemClickHandler);
	}

	const documentClickHandler = (e: PointerEvent) => {
		// Don't deactivate if clicking in a textarea or input
		if (
			e.target instanceof HTMLElement &&
			(e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT')
		) {
			return;
		}

		// Check if click is outside the comments area
		if (itemData.activeItem && e.target instanceof HTMLElement) {
			const clickedInsideComment = comments.some((comment) =>
				comment.contains(e.target as Node)
			);
			if (!clickedInsideComment) {
				itemKeyboardHandlers.escape(itemData);
			}
		}
	};

	doc.addEventListener('click', documentClickHandler);

	ctx.onInvalidated(() => {
		window.removeEventListener('keydown', keydownHandler);
		for (const comment of comments) {
			comment.removeEventListener('click', itemClickHandler);
		}
		doc.removeEventListener('click', documentClickHandler);
	});
};
