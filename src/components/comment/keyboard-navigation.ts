import type { ContentScriptContext } from '#imports';
import { CommentData } from '@/components/comment/comment-data.ts';
import { focusClass, focusClassDefault, HNComment } from '@/components/comment/hn-comment.ts';
import { KeyboardHandlers } from '@/components/comment/keyboard-handlers.ts';
import type { KeyboardNavState } from '@/components/common/keyboard-navigation.ts';
import { dom } from '@/utils/dom.ts';

export const keyboardNavigation = async (
	ctx: ContentScriptContext,
	doc: Document,
	commentElements: HTMLElement[],
	navState?: KeyboardNavState
): Promise<void> => {
	const style = doc.createElement('style');
	style.textContent = `
		:root {
			--oj-focus-color: #f7694c;
			--oj-focus-w: 2px;
			--oj-focus-pad: 4px;
		}

		tr.athing td.default {
			padding: var(--oj-focus-pad);
		}

		tr.${focusClass} td {
			--oj-top: inset 0 0 0 0 transparent;
			--oj-right: inset 0 0 0 0 transparent;
			--oj-bottom: inset 0 0 0 0 transparent;
			--oj-left: inset 0 0 0 0 transparent;
			box-shadow: var(--oj-top), var(--oj-right), var(--oj-bottom), var(--oj-left);
		}

		tr.${focusClass} td.${focusClassDefault} {
			background-color: #fbfbf7;
			--oj-top: inset 0 var(--oj-focus-w) 0 0 var(--oj-focus-color);
			--oj-right: inset calc(-1 * var(--oj-focus-w)) 0 0 0 var(--oj-focus-color);
			--oj-bottom: inset 0 calc(-1 * var(--oj-focus-w)) 0 0 var(--oj-focus-color);
			--oj-left: inset var(--oj-focus-w) 0 0 0 var(--oj-focus-color);
		}

		tr.${focusClass}.morelink {
			margin: 0;
		}
	`;
	doc.head.appendChild(style);

	function prevent(doc: Document, e?: KeyboardEvent) {
		if (doc.activeElement?.tagName === undefined) {
			return true;
		}

		if (doc.activeElement.tagName === 'TEXTAREA') {
			const textarea = doc.activeElement as HTMLTextAreaElement;
			const isReplyTextarea = textarea.closest('tr')?.querySelector('textarea') === textarea;
			if (isReplyTextarea && e?.key === 'Escape') {
				return false;
			}
			return isReplyTextarea;
		}

		if (doc.activeElement.tagName === 'INPUT') {
			return true;
		}

		if (doc.activeElement.tagName === 'A') {
			(doc.activeElement as HTMLAnchorElement).blur();
		}

		if (navState?.helpModalOpen && e) {
			if (e.key === 'Escape') {
				return;
			}
			e.preventDefault();
			e.stopPropagation();
			return;
		}

		return false;
	}

	const comments = commentElements.map((el) => new HNComment(el));
	const commentData = new CommentData(comments);
	const keyboardHandlers = new KeyboardHandlers(doc);

	await keyboardHandlers.checkActiveState(commentData);
	const pageshowHandler = () => {
		void keyboardHandlers.checkActiveState(commentData);
	};
	window.addEventListener('pageshow', pageshowHandler);

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: it is just complex
	const keydownHandler = async (e: KeyboardEvent) => {
		if (prevent(doc, e)) {
			return;
		}

		const combo = dom.isComboKey(e);

		switch (e.key) {
			case 'J':
			case 'j':
				if (!combo || e.shiftKey) {
					await keyboardHandlers.move(e, commentData, 'down');
				}
				break;
			case 'K':
			case 'k':
				if (!combo || e.shiftKey) {
					await keyboardHandlers.move(e, commentData, 'up');
				}
				break;
			case 'Escape':
			case 'escape':
				if (!combo) {
					if (commentData.replyButton) {
						const activeComment = commentData.getActiveComment();
						commentData.replyButton.click();
						commentData.replyButton = undefined;
						if (activeComment) {
							await keyboardHandlers.activateComment(commentData, activeComment);
						}
					} else {
						await keyboardHandlers.escape(commentData);
					}
				}
				break;
			case 'r':
				if (!combo && commentData.getActiveComment()) {
					commentData.replyButton = keyboardHandlers.reply(commentData);
				}
				break;
			case 'f':
				if (!combo && commentData.getActiveComment()) {
					keyboardHandlers.favorite(commentData);
				}
				break;
			case 'X':
				if (combo && commentData.getActiveComment()) {
					keyboardHandlers.flag(commentData);
				}
				break;
			case 'n':
				if (!combo && commentData.getActiveComment()) {
					await keyboardHandlers.next(commentData);
				}
				break;
			case 'p':
				if (!combo && commentData.getActiveComment()) {
					await keyboardHandlers.previous(commentData);
				}
				break;
			case 'u':
				if (!combo && commentData.getActiveComment()) {
					keyboardHandlers.upvote(commentData);
				}
				break;
			case 'd':
				if (!combo && commentData.getActiveComment()) {
					keyboardHandlers.downvote(commentData);
				}
				break;
			case 'c':
				if (!combo && commentData.getActiveComment()) {
					keyboardHandlers.collapseToggle(commentData);
				}
				break;
			case 't':
				if (!combo) {
					doc.body.scrollTo(0, 0);
				}
				break;
			case 'b':
				if (!combo) {
					window.history.back();
				}
				break;
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
				if (commentData.getActiveComment()) {
					return keyboardHandlers.openReferenceLink(e, commentData);
				}
				break;
			default:
				break;
		}
	};

	doc.addEventListener('keydown', keydownHandler);

	const clickToFocus = (e: MouseEvent) => {
		keyboardHandlers.activateElement(commentData, e.target as HTMLElement);
	};

	commentData.addEventListener('click', clickToFocus);

	const documentClickHandler = async (e: PointerEvent) => {
		if (
			e.target instanceof HTMLElement &&
			(e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT')
		) {
			return;
		}

		if (commentData.getActiveComment() && e.target instanceof HTMLElement) {
			const clickedInsideComment = commentElements.some((comment) =>
				comment.contains(e.target as Node)
			);
			if (!clickedInsideComment) {
				await keyboardHandlers.escape(commentData);
			}
		}
	};

	doc.addEventListener('click', documentClickHandler);

	ctx.onInvalidated(() => {
		doc.removeEventListener('keydown', keydownHandler);
		commentData.removeEventListener('click', clickToFocus);
		doc.removeEventListener('click', documentClickHandler);
		window.removeEventListener('pageshow', pageshowHandler);
	});
};
