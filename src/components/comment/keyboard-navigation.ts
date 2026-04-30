import type { ContentScriptContext } from '#imports';
import type { CommentData } from '@/components/comment/comment-data.ts';
import { focusClass, focusClassDefault } from '@/components/comment/hn-comment.ts';
import { KeyboardHandlers } from '@/components/comment/keyboard-handlers.ts';
import {
	getKeyboardCommand,
	loadKeyboardCommandConfig,
} from '@/components/common/keyboard-commands.ts';
import type { KeyboardNavState } from '@/components/common/keyboard-navigation.ts';
import { getEnableFocusBoxPreference } from '@/utils/preferences.ts';
import { registerPreferencesUpdateHandler } from '@/utils/preferences-live.ts';

const COMMENT_FOCUS_STYLE_ID = 'oj-comment-focus-style';

const syncFocusBoxStyle = async (doc: Document): Promise<void> => {
	const existingStyle = doc.getElementById(COMMENT_FOCUS_STYLE_ID);
	if (!(await getEnableFocusBoxPreference())) {
		existingStyle?.remove();
		return;
	}
	if (existingStyle) {
		return;
	}

	const style = doc.createElement('style');
	style.id = COMMENT_FOCUS_STYLE_ID;
	style.textContent = `
			:root {
				--oj-focus-color: #f7694c;
				--oj-focus-w: 1px;
				--oj-focus-pad: 4px;
			}

			tr.athing td.default {
				padding: var(--oj-focus-pad);
			}

			tr.${focusClass} td.${focusClassDefault} {
				background-color: #fbfbf7;
				--oj-top: inset 0 var(--oj-focus-w) 0 0 var(--oj-focus-color);
				--oj-right: inset calc(-1 * var(--oj-focus-w)) 0 0 0 var(--oj-focus-color);
				--oj-bottom: inset 0 calc(-1 * var(--oj-focus-w)) 0 0 var(--oj-focus-color);
				--oj-left: inset var(--oj-focus-w) 0 0 0 var(--oj-focus-color);
				box-shadow: var(--oj-top), var(--oj-right), var(--oj-bottom), var(--oj-left);
			}

			tr.${focusClass}.morelink {
				margin: 0;
			}
		`;
	doc.head.appendChild(style);
};

export const keyboardNavigation = async (
	ctx: ContentScriptContext,
	doc: Document,
	commentElements: HTMLElement[],
	commentData: CommentData,
	navState?: KeyboardNavState
): Promise<void> => {
	await loadKeyboardCommandConfig();
	await syncFocusBoxStyle(doc);
	registerPreferencesUpdateHandler(ctx, async () => {
		await syncFocusBoxStyle(doc);
	});

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

	const keyboardHandlers = new KeyboardHandlers(doc);

	await keyboardHandlers.checkActiveState(commentData);
	const pageshowHandler = () => {
		keyboardHandlers.checkActiveState(commentData);
	};
	window.addEventListener('pageshow', pageshowHandler);

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: it is just complex
	const keydownHandler = async (e: KeyboardEvent) => {
		if (prevent(doc, e)) {
			return;
		}

		const command = getKeyboardCommand('comments', e);

		switch (command?.id) {
			case 'move-down':
				await keyboardHandlers.move(e, commentData, 'down');
				break;
			case 'move-up': {
				const activeComment = commentData.getActiveComment();
				if (activeComment && !commentData.getPrevious(activeComment, true)) {
					activeComment.activate();
					break;
				}
				await keyboardHandlers.move(e, commentData, 'up');
				if (activeComment && !commentData.getActiveComment()) {
					await keyboardHandlers.activateComment(commentData, activeComment);
				}
				break;
			}
			case 'move-down-same-or-higher-indent':
				if (commentData.getActiveComment()) {
					await keyboardHandlers.moveAtSameOrHigherIndent(commentData, 'down');
				}
				break;
			case 'move-up-same-or-higher-indent':
				if (commentData.getActiveComment()) {
					const activeComment = commentData.getActiveComment();
					await keyboardHandlers.moveAtSameOrHigherIndent(commentData, 'up');
					if (activeComment && !commentData.getActiveComment()) {
						await keyboardHandlers.activateComment(commentData, activeComment);
					}
				}
				break;
			case 'escape':
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
				break;
			case 'reply':
				if (commentData.getActiveComment()) {
					commentData.replyButton = keyboardHandlers.reply(commentData);
				}
				break;
			case 'favorite':
				if (commentData.getActiveComment()) {
					keyboardHandlers.favorite(commentData);
				}
				break;
			case 'copy-hn-url':
				if (commentData.getActiveComment()) {
					await keyboardHandlers.copyHnUrl(commentData);
				}
				break;
			case 'flag':
				if (commentData.getActiveComment()) {
					keyboardHandlers.flag(commentData);
				}
				break;
			case 'move-down-expand':
				if (commentData.getActiveComment()) {
					await keyboardHandlers.move(
						{ ...e, shiftKey: true } as KeyboardEvent,
						commentData,
						'down'
					);
				}
				break;
			case 'move-up-expand':
				if (commentData.getActiveComment()) {
					await keyboardHandlers.move(
						{ ...e, shiftKey: true } as KeyboardEvent,
						commentData,
						'up'
					);
				}
				break;
			case 'move-down-same-indent':
				if (commentData.getActiveComment()) {
					await keyboardHandlers.moveAtSameIndent(commentData, 'down');
				}
				break;
			case 'move-up-same-indent':
				if (commentData.getActiveComment()) {
					await keyboardHandlers.moveAtSameIndent(commentData, 'up');
				}
				break;
			case 'upvote':
				if (commentData.getActiveComment()) {
					keyboardHandlers.upvote(commentData);
				}
				break;
			case 'downvote':
				if (commentData.getActiveComment()) {
					keyboardHandlers.downvote(commentData);
				}
				break;
			case 'collapse-toggle':
				if (commentData.getActiveComment()) {
					keyboardHandlers.collapseToggle(commentData);
				}
				break;
			case 'collapse-root':
				if (commentData.getActiveComment()) {
					await keyboardHandlers.collapseExpandRoot(commentData);
				}
				break;
			case 'scroll-active-to-top':
				if (commentData.getActiveComment()) {
					keyboardHandlers.scrollActiveCommentToTop(commentData);
				}
				break;
			case 'scroll-page-to-top':
				doc.body.scrollTo(0, 0);
				break;
			case 'back':
				window.history.back();
				break;
			case 'open-reference-link':
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
