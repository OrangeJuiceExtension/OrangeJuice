import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import { backticksToCode } from '@/components/comment/backticks-to-code.ts';
import { changeDeadCommentsColor } from '@/components/comment/change-dead-comments-color.ts';
import { indentToggle } from '@/components/comment/indent-toggle.ts';
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
		if (!validPaths.some((p) => document.location.pathname.startsWith(p))) {
			return;
		}

		const comments = dom.getAllComments(document);
		return Promise.all([
			Promise.resolve().then(() => initCommentUX(document, comments)),
			Promise.resolve().then(() => highlightUnreadComments(document, comments)),
			Promise.resolve().then(() => indentToggle(document, comments)),
			Promise.resolve().then(() => changeDeadCommentsColor(document, comments)),
			Promise.resolve().then(() => backticksToCode(document, comments)),
		]);
	},
};
