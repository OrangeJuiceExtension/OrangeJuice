import type { ContentScriptContext } from '#imports';
import {
	getKeyboardCommand,
	loadKeyboardCommandConfig,
} from '@/components/common/keyboard-commands.ts';
import { getKeyboardShortcutsHelp } from '@/components/common/keyboard-shortcuts-help.tsx';
import { showModal } from '@/components/common/modal.ts';
import { paths } from '@/utils/paths.ts';

export interface KeyboardNavState {
	helpModalOpen: boolean;
}

export const keyboardNavigation = async (
	ctx: ContentScriptContext,
	doc: Document,
	username?: string
): Promise<KeyboardNavState> => {
	await loadKeyboardCommandConfig();

	const state: KeyboardNavState = {
		helpModalOpen: false,
	};

	const keydownHandler = async (event: KeyboardEvent): Promise<void> => {
		let locationUrl: string | undefined;
		const command = getKeyboardCommand('navigation', event);

		switch (command?.id) {
			case 'show-help': {
				if (state.helpModalOpen) {
					return;
				}
				// someone could be typing and hit '?'
				const tagName = (event.target as HTMLElement).tagName;
				if (tagName === 'TEXTAREA' || tagName === 'INPUT') {
					return;
				}

				state.helpModalOpen = true;
				showModal({
					doc,
					ctx,
					content: await getKeyboardShortcutsHelp(doc),
					variant: 'shortcuts',
					onClose: () => {
						state.helpModalOpen = false;
					},
				});
				break;
			}

			case 'go-home': {
				locationUrl = paths.base;
				break;
			}

			case 'go-submit': {
				locationUrl = `${paths.base}/submit`;
				break;
			}

			case 'go-show': {
				locationUrl = `${paths.base}/show`;
				break;
			}

			case 'go-ask': {
				locationUrl = `${paths.base}/ask`;
				break;
			}

			case 'go-new': {
				locationUrl = `${paths.base}/newest`;
				break;
			}

			case 'go-profile': {
				locationUrl = username ? `${paths.base}/user?id=${username}` : undefined;
				break;
			}

			case 'go-threads': {
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
