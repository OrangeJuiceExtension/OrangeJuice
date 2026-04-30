import type { ContentScriptContext } from '#imports';
import { getKeyboardCommand } from '@/components/common/keyboard-commands.ts';
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
import { getEnableFocusBoxPreference } from '@/utils/preferences.ts';
import { registerPreferencesUpdateHandler } from '@/utils/preferences-live.ts';

const STORY_FOCUS_STYLE_ID = 'oj-story-focus-style';

const syncFocusBoxStyle = async (doc: Document): Promise<void> => {
	const existingStyle = doc.getElementById(STORY_FOCUS_STYLE_ID);
	if (!(await getEnableFocusBoxPreference())) {
		existingStyle?.remove();
		return;
	}
	if (existingStyle) {
		return;
	}

	const style = doc.createElement('style');
	style.id = STORY_FOCUS_STYLE_ID;
	style.textContent = `
			:root {
			  --oj-focus-color: #f7694c;
			  --oj-focus-w: 1px;
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
};

export const keyboardNavigation = async (
	ctx: ContentScriptContext,
	doc: Document,
	storyData: StoryData,
	navState?: KeyboardNavState
): Promise<void> => {
	await syncFocusBoxStyle(doc);
	registerPreferencesUpdateHandler(ctx, async () => {
		await syncFocusBoxStyle(doc);
	});

	const keyboardHandlers = new KeyboardHandlers(doc);

	await keyboardHandlers.checkNavState(storyData);

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: shrug
	const keydownHandler = async (e: KeyboardEvent) => {
		if (dom.isEditableField(doc.activeElement)) {
			return;
		}

		if (navState?.helpModalOpen) {
			if (e.key === 'Escape') {
				return;
			}
			e.preventDefault();
			e.stopPropagation();
			return;
		}

		const command = getKeyboardCommand('stories', e);

		switch (command?.id) {
			case 'move-down':
				keyboardHandlers.move(storyData, 'down');
				break;
			case 'move-up':
				keyboardHandlers.move(storyData, 'up');
				break;
			case 'open-comments-new-tab':
				if (storyData.getActiveStory()) {
					keyboardHandlers.openComments(storyData, true);
				}
				break;
			case 'open-comments':
				if (storyData.getActiveStory()) {
					keyboardHandlers.openComments(storyData, false);
				}
				break;
			case 'open-story-new-tab':
				if (storyData.getActiveStory()) {
					keyboardHandlers.openStoryUrl(storyData, true);
				}
				break;
			case 'open-story':
				if (storyData.getActiveStory()) {
					keyboardHandlers.openStoryUrl(storyData, false);
				}
				break;
			case 'upvote':
				if (storyData.getActiveStory()) {
					keyboardHandlers.vote(storyData);
				}
				break;
			case 'favorite':
				if (storyData.getActiveStory()) {
					keyboardHandlers.favorite(storyData);
				}
				break;
			case 'flag':
				if (storyData.getActiveStory()) {
					keyboardHandlers.flag(storyData);
				}
				break;
			case 'reply':
				if (storyData.getActiveStory()) {
					keyboardHandlers.reply(storyData);
				}
				break;
			case 'copy-hn-url':
				if (storyData.getActiveStory()) {
					await keyboardHandlers.copyHnUrl(storyData);
				}
				break;
			case 'open-selected':
				if (storyData.getActiveStory()) {
					keyboardHandlers.open(storyData);
				}
				break;
			case 'open-with-comments':
				if (storyData.getActiveStory()) {
					keyboardHandlers.openWithComments(storyData);
				}
				break;
			case 'open-position':
				keyboardHandlers.openByPosition(storyData, e.key);
				break;
			case 'more':
				keyboardHandlers.clickMore(doc);
				break;
			case 'back':
				keyboardHandlers.goBack();
				break;
			case 'toggle-hide-read':
				keyboardHandlers.toggleHideRead(doc);
				break;
			case 'hide-read-now':
				keyboardHandlers.hideReadStoriesNow(storyData);
				break;
			case 'escape':
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

	const pageshowHandler = async (): Promise<void> => {
		await keyboardHandlers.checkNavState(storyData);
	};
	window.addEventListener('pageshow', pageshowHandler);

	ctx.onInvalidated(() => {
		doc.removeEventListener('keydown', keydownHandler);
		storyData.removeEventListener('click', clickToFocus);
		doc.removeEventListener('click', documentClickHandler);
		window.removeEventListener('pageshow', pageshowHandler);
	});
};
