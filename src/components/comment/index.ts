import type { ContentScriptContext } from '#imports';
import { backticksToCode } from '@/components/comment/backticks-to-code.ts';
import { changeDeadCommentsColor } from '@/components/comment/change-dead-comments-color.ts';
import { collapseRoot } from '@/components/comment/collapse-root.ts';
import { indentToggle } from '@/components/comment/indent-toggle.ts';
import { inlineReply } from '@/components/comment/inline-reply.ts';
import { keyboardNavigation } from '@/components/comment/keyboard-navigation.ts';
import { createClientServices } from '@/services/manager.ts';
import { dom } from '@/utils/dom.ts';
import { paths } from '@/utils/paths.ts';
import type { ComponentFeature } from '@/utils/types.ts';
import { highlightUnreadComments } from './highlight-unread-comments.ts';
import { initCommentUX } from './init-comment-ux.ts';

const validPaths = [...paths.comments];

export const comments: ComponentFeature = {
	id: 'comments',
	loginRequired: true,
	matches: [`${paths.base}/*`],
	runAt: 'document_end',
	main(ctx: ContentScriptContext) {
		if (!validPaths.some((p) => document.location.pathname.startsWith(p))) {
			return;
		}

		const manager = createClientServices();

		const allComments = dom.getAllComments(document);
		return Promise.all([
			Promise.resolve().then(() => initCommentUX(document, allComments, comments.username)),
			Promise.resolve().then(() => highlightUnreadComments(document, allComments, manager)),
			Promise.resolve().then(() => indentToggle(document, allComments)),
			Promise.resolve().then(() => changeDeadCommentsColor(document, allComments)),
			Promise.resolve().then(() => backticksToCode(document, allComments)),
			Promise.resolve().then(() => collapseRoot(ctx, document, allComments)),
			Promise.resolve().then(() => keyboardNavigation(ctx, document, allComments)),
			Promise.resolve().then(() => inlineReply(ctx, document)),
		]);
	},
};
