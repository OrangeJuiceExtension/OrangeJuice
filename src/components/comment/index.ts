import type { ContentScriptContext } from '#imports';
import { backticksToCode } from '@/components/comment/backticks-to-code.ts';
import { changeDeadCommentsColor } from '@/components/comment/change-dead-comments-color.ts';
import { collapseRoot } from '@/components/comment/collapse-root.ts';
import { indentToggle } from '@/components/comment/indent-toggle.ts';
import { keyboardNavigation } from '@/components/comment/keyboard-navigation.ts';
import { openInNewTab } from '@/components/comment/open-in-new-tab.ts';
import { createServicesManager } from '@/services/manager.ts';
import { dom } from '@/utils/dom.ts';
import { paths } from '@/utils/paths.ts';
import type { ComponentFeature } from '@/utils/types.ts';
import { highlightUnreadComments } from './highlight-unread-comments.ts';
import { initCommentUX } from './init-comment-ux.ts';

const validPaths = [...paths.comments, ...paths.specialComments];

export const comments: ComponentFeature = {
	id: 'comments',
	loginRequired: true,
	matches: [`${paths.base}/*`],
	runAt: 'document_end',
	main(_ctx: ContentScriptContext) {
		// runs on all pages
		openInNewTab(_ctx, document);

		if (!validPaths.some((p) => document.location.pathname.startsWith(p))) {
			return;
		}

		const manager = createServicesManager();

		const comments = dom.getAllComments(document);
		return Promise.all([
			Promise.resolve().then(() => initCommentUX(document, comments)),
			Promise.resolve().then(() => highlightUnreadComments(document, comments, manager)),
			Promise.resolve().then(() => indentToggle(document, comments)),
			Promise.resolve().then(() => changeDeadCommentsColor(document, comments)),
			Promise.resolve().then(() => backticksToCode(document, comments)),
			Promise.resolve().then(() => collapseRoot(document, comments, _ctx)),
			Promise.resolve().then(() => keyboardNavigation(document, comments, _ctx)),
		]);
	},
};
