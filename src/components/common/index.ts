import type { ContentScriptContext } from '#imports';
import {
	type KeyboardNavState,
	keyboardNavigation,
} from '@/components/common/keyboard-navigation.ts';
import { openInNewTab } from '@/components/common/open-in-new-tab.ts';
import { resizeTextarea } from '@/components/common/resize-textarea.ts';
import { paths } from '@/utils/paths.ts';

let navState: KeyboardNavState | undefined;

export const getNavState = (): KeyboardNavState | undefined => navState;

export const common: ComponentFeature = {
	id: 'common',
	loginRequired: false,
	matches: [`${paths.base}/*`],
	runAt: 'document_end',
	main(ctx: ContentScriptContext) {
		return Promise.all([
			Promise.resolve().then(() => openInNewTab(ctx, document)),
			Promise.resolve().then(() => resizeTextarea(ctx, document)),
			Promise.resolve().then(() => {
				navState = keyboardNavigation(ctx, document, common.username);
			}),
		]);
	},
};
