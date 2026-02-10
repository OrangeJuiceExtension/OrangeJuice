import type { ContentScriptContext } from '#imports';
import type { KeyboardNavState } from '@/components/common/keyboard-navigation.ts';
import { KeyboardHandlers } from '@/components/story/keyboard-handlers.ts';
import {
	focusClass1,
	focusClass2,
	focusClass3,
	type StoryData,
} from '@/components/story/story-data.ts';
import { USER_INFO_HOVER_CLASS } from '@/components/user/show-user-info-hover.ts';
import { dom } from '@/utils/dom.ts';

export const keyboardNavigation = async (
	ctx: ContentScriptContext,
	doc: Document,
	storyData: StoryData,
	navState?: KeyboardNavState
): Promise<void> => {
	const style = doc.createElement('style');
	style.textContent = `
		:root {
		  --oj-focus-color: #f7694c;
		  --oj-focus-w: 2px;
		}
		
		tr.athing > td:last-child {
			padding-top: 2px;
			padding-right: 4px;
		}
		
		tr.athing > td:first-child,
		tr.${focusClass2} > td:first-child,
		tr.${focusClass3} > td:first-child {
		  padding-left: 4px;
		}
		
		/* Base: 4 “slots” for shadows */
		tr.${focusClass1} > td,
		tr.${focusClass2} > td,
		tr.${focusClass3} > td {
		  --oj-top: inset 0 0 0 0 transparent;
		  --oj-right: inset 0 0 0 0 transparent;
		  --oj-bottom: inset 0 0 0 0 transparent;
		  --oj-left: inset 0 0 0 0 transparent;
		  box-shadow: var(--oj-top), var(--oj-right), var(--oj-bottom), var(--oj-left);
		  background-color: #fbfbf7;
		}

		html.oj-dark-mode tr.${focusClass1} > td,
		html.oj-dark-mode tr.${focusClass2} > td,
		html.oj-dark-mode tr.${focusClass3} > td {
		  background-color: rgb(44, 42, 31);
		}
		
		/* Top edge */
		tr.${focusClass1} > td {
		  --oj-top: inset 0 var(--oj-focus-w) 0 0 var(--oj-focus-color);
		}
		
		/* Bottom edge */
		tr.${focusClass3} > td {
		  --oj-bottom: inset 0 calc(-1 * var(--oj-focus-w)) 0 0 var(--oj-focus-color);
		}
		
		/* Left edge */
		tr.${focusClass1} > td:first-child,
		tr.${focusClass2} > td:first-child,
		tr.${focusClass3} > td:first-child {
		  --oj-left: inset var(--oj-focus-w) 0 0 0 var(--oj-focus-color);
		}
		
		/* Right edge */
		tr.${focusClass1} > td:last-child,
		tr.${focusClass2} > td:last-child,
		tr.${focusClass3} > td:last-child {
		  --oj-right: inset calc(-1 * var(--oj-focus-w)) 0 0 0 var(--oj-focus-color);
		}

		/** info hover class lives inside focusClass2, so we need to unstyle things */
		tr.${focusClass2} > td .${USER_INFO_HOVER_CLASS},
		.${focusClass2} .${USER_INFO_HOVER_CLASS} {
		  box-shadow: none;
		  background: #f6f6ef;
		}

		html.oj-dark-mode tr.${focusClass2} > td .${USER_INFO_HOVER_CLASS},
		html.oj-dark-mode .${focusClass2} .${USER_INFO_HOVER_CLASS} {
		  background: rgb(44, 42, 31);
		}

		tr.${focusClass2} > td .${USER_INFO_HOVER_CLASS} *,
		.${focusClass2} .${USER_INFO_HOVER_CLASS} * {
		  box-shadow: none;
		}
	`;
	doc.head.appendChild(style);

	const keyboardHandlers = new KeyboardHandlers(doc);

	await keyboardHandlers.checkNavState(storyData);

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: shrug
	const keydownHandler = (e: KeyboardEvent) => {
		if (navState?.helpModalOpen) {
			if (e.key === 'Escape') {
				return;
			}
			e.preventDefault();
			e.stopPropagation();
			return;
		}

		const combo = dom.isComboKey(e);
		const modifier = e.ctrlKey || e.metaKey || e.altKey;

		switch (e.key) {
			case 'ArrowDown':
				keyboardHandlers.move(storyData, 'down');
				break;
			case 'ArrowUp':
				keyboardHandlers.move(storyData, 'up');
				break;
			case 'ArrowLeft':
				if (!modifier && storyData.getActiveStory()) {
					keyboardHandlers.openComments(storyData, !e.shiftKey);
				}
				break;
			case 'ArrowRight':
				if (!modifier && storyData.getActiveStory()) {
					keyboardHandlers.openStoryUrl(storyData, !e.shiftKey);
				}
				break;
			// j: Go down
			case 'J':
			case 'j':
				keyboardHandlers.move(storyData, 'down');
				break;
			// k: Go up
			case 'K':
			case 'k':
				keyboardHandlers.move(storyData, 'up');
				break;
			case 'u':
				if (!combo && storyData.getActiveStory()) {
					keyboardHandlers.vote(storyData);
				}
				break;
			case 'f':
				if (!combo && storyData.getActiveStory()) {
					keyboardHandlers.favorite(storyData);
				}
				break;
			case 'X':
				if (!combo && storyData.getActiveStory()) {
					keyboardHandlers.flag(storyData);
				}
				break;
			case 'r':
				if (!combo && storyData.getActiveStory()) {
					keyboardHandlers.reply(storyData);
				}
				break;
			case 'Enter':
				if (!combo && storyData.getActiveStory()) {
					keyboardHandlers.open(storyData);
				}
				break;
			case 'O':
				if (combo && storyData.getActiveStory()) {
					keyboardHandlers.openWithComments(storyData);
				}
				break;
			case '1':
			case '2':
			case '3':
			case '4':
			case '5':
			case '6':
			case '7':
			case '8':
			case '9':
			case '0':
				if (!combo) {
					keyboardHandlers.openByPosition(storyData, e.key);
				}
				break;
			case 'm':
				if (!combo) {
					keyboardHandlers.clickMore(doc);
				}
				break;
			case 'b':
				if (!combo) {
					keyboardHandlers.goBack();
				}
				break;
			case 'h':
				if (!combo) {
					keyboardHandlers.toggleHideRead(doc);
				}
				break;
			case 'H':
				if (combo) {
					keyboardHandlers.hideReadStoriesNow(storyData);
				}
				break;
			case 'Escape':
				keyboardHandlers.escape(storyData);
				break;
			default:
				break;
		}
	};
	doc.addEventListener('keydown', keydownHandler);

	const clickToFocus = async (e: MouseEvent) => {
		await keyboardHandlers.activateElement(storyData, e.target as HTMLElement);
	};

	storyData.addEventListener('click', clickToFocus);

	const documentClickHandler = async (e: MouseEvent) => {
		if (
			e.target instanceof HTMLElement &&
			(e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT')
		) {
			return;
		}

		if (storyData.getActiveStory() && e.target instanceof HTMLElement) {
			const clickedInsideStory = Boolean(e.target.closest('[data-story-id]'));
			if (!clickedInsideStory) {
				await keyboardHandlers.escape(storyData);
			}
		}
	};

	doc.addEventListener('click', documentClickHandler);

	ctx.onInvalidated(() => {
		doc.removeEventListener('keydown', keydownHandler);
		storyData.removeEventListener('click', clickToFocus);
		doc.removeEventListener('click', documentClickHandler);
	});
};
