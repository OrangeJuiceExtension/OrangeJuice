import type { ContentScriptContext } from '#imports';
import { getKeyboardShortcutsHelp } from '@/components/common/keyboard-shortcuts-help.tsx';
import { showModal } from '@/components/common/modal.ts';
import { dom } from '@/utils/dom.ts';
import { paths } from '@/utils/paths.ts';

export interface KeyboardNavState {
	helpModalOpen: boolean;
}

export const keyboardNavigation = (
	ctx: ContentScriptContext,
	doc: Document,
	username?: string
): KeyboardNavState => {
	const state: KeyboardNavState = {
		helpModalOpen: false,
	};

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: it is ok
	const keydownHandler = (event: KeyboardEvent) => {
		let locationUrl: string | undefined;

		switch (event.key) {
			// Help!
			case '?': {
				if (state.helpModalOpen) {
					return;
				}
				// someone could be typing and hit '?'
				const tagName = (event.target as HTMLElement).tagName;
				if (tagName === 'TEXTAREA' || tagName === 'INPUT') {
					return;
				}

				const combo = dom.isComboKey(event);
				if (combo && !state.helpModalOpen) {
					state.helpModalOpen = true;
					showModal({
						doc,
						ctx,
						content: getKeyboardShortcutsHelp(doc),
						variant: 'shortcuts',
						onClose: () => {
							state.helpModalOpen = false;
						},
					});
				}
				break;
			}

			// H: Home
			case 'Ó': {
				locationUrl = paths.base;
				break;
			}

			// S: Submit
			case 'Í': {
				locationUrl = `${paths.base}/submit`;
				break;
			}

			// O: Show
			case 'Ø': {
				locationUrl = `${paths.base}/show`;
				break;
			}

			// A: Ask
			case 'Å': {
				locationUrl = `${paths.base}/ask`;
				break;
			}

			// N: New
			case '˜': {
				locationUrl = `${paths.base}/newest`;
				break;
			}

			// P: Profile
			case '∏': {
				locationUrl = username ? `${paths.base}/user?id=${username}` : undefined;
				break;
			}

			// T: Threads
			case 'ˇ': {
				locationUrl = username ? `${paths.base}/threads?id=${username}` : undefined;
				break;
			}

			default:
				break;
		}

		if (locationUrl) {
			window.location.href = locationUrl;
		}
	};

	doc.addEventListener('keydown', keydownHandler);

	ctx.onInvalidated(() => {
		doc.removeEventListener('keydown', keydownHandler);
	});

	return state;
};
