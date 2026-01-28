import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import { dom } from '@/utils/dom.ts';
import { itemKeyboardHandlers } from '@/utils/item-keyboard-handlers.ts';

export const keyboardNavigation = (
	doc: Document,
	_comments: HTMLElement[],
	ctx: ContentScriptContext
): void => {
	const style = doc.createElement('style');
	style.textContent = `
		.oj_focused_item {
			outline: 3px solid #f7694c73;
			padding: 20px;
			background-color: white;
		}
		
		.oj_focused_item.morelink {
			margin: 0;
		}
	`;
	doc.head.appendChild(style);

	const itemData: ItemData = {
		index: 0,
		activeItem: undefined,
		commentList: false,
		items: [
			...(document.querySelectorAll(
				'tr.comtr:not(.noshow) td.default'
			) as NodeListOf<HTMLElement>),
		],
	};

	// for (const comment of comments) {
	// }
	const keydownHandler = (e: KeyboardEvent): void => {
		const combo = dom.isComboKey(e);

		switch (e.key) {
			// J: Go down
			case 'j':
				if (combo && !e.shiftKey) {
					return;
				}

				itemKeyboardHandlers.down(itemData, e);
				return;

			// K: Go up
			case 'k':
				if (combo && !e.shiftKey) {
					return;
				}

				itemKeyboardHandlers.up(itemData, e);
				return;

			// Escape
			case 'Escape':
			case 'escape':
				if (combo) {
					return;
				}

				itemKeyboardHandlers.escape(itemData);
				return;

			default:
				break;
		}
	};

	window.addEventListener('keydown', keydownHandler);

	ctx.onInvalidated(() => {
		window.removeEventListener('keydown', keydownHandler);
	});
};
