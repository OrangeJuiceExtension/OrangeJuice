import type { ContentScriptContext } from '#imports';
import { backticksToCode } from '@/components/comment/backticks-to-code.ts';
import { commentBeautifulMermaid } from '@/components/comment/beautiful-mermaid.ts';
import { changeDeadCommentsColor } from '@/components/comment/change-dead-comments-color.ts';
import { collapseRoot } from '@/components/comment/collapse-root.ts';
import { persistCollapsedComments } from '@/components/comment/collapsed-comments.ts';
import { CommentData } from '@/components/comment/comment-data.ts';
import { githubEmoji } from '@/components/comment/github-emoji.ts';
import { highlightUnreadComments } from '@/components/comment/highlight-unread-comments.ts';
import { HNComment } from '@/components/comment/hn-comment.ts';
import { indentToggle } from '@/components/comment/indent-toggle.ts';
import { initCommentUX } from '@/components/comment/init-comment-ux.ts';
import { inlineReply } from '@/components/comment/inline-reply.ts';
import { keyboardNavigation } from '@/components/comment/keyboard-navigation.ts';
import { applyMutedComments } from '@/components/comment/muted-comments.ts';
import { replyFocusTextarea } from '@/components/comment/reply-focus.ts';
import { getNavState } from '@/components/common/index.ts';
import { createClientServices } from '@/services/manager.ts';
import { dom } from '@/utils/dom.ts';
import { getMutedUsers } from '@/utils/muted-users.ts';
import { paths } from '@/utils/paths.ts';
import type { ComponentFeature } from '@/utils/types.ts';

const validPaths = [...paths.comments, ...paths.specialComments, '/edit'];

export const comments: ComponentFeature = {
	id: 'comments',
	loginRequired: true,
	matches: [`${paths.base}/*`],
	runAt: 'document_end',
	async main(ctx: ContentScriptContext) {
		if (!validPaths.some((p) => document.location.pathname.startsWith(p))) {
			return;
		}

		const manager = createClientServices();

		const allComments = dom.getAllComments(document);
		const itemAuthor = dom.getItemAuthor(document);
		const hnComments = allComments.map((el) => new HNComment(el));
		const commentData = new CommentData(hnComments);
		const mutedUsers = await getMutedUsers();

		return Promise.all([
			Promise.resolve().then(() => initCommentUX(document, allComments, itemAuthor)),
			Promise.resolve().then(() => applyMutedComments(document, hnComments, mutedUsers)),
			Promise.resolve().then(() => highlightUnreadComments(document, allComments, manager)),
			Promise.resolve().then(() => persistCollapsedComments(ctx, allComments)),
			Promise.resolve().then(() => indentToggle(ctx, document, allComments)),
			Promise.resolve().then(() => changeDeadCommentsColor(document, allComments)),
			Promise.resolve().then(() => backticksToCode(document, allComments)),
			Promise.resolve().then(() => githubEmoji(document, allComments)),
			Promise.resolve().then(() => commentBeautifulMermaid(ctx, document, hnComments)),
			Promise.resolve().then(() => collapseRoot(ctx, document, allComments, commentData)),
			Promise.resolve().then(() =>
				keyboardNavigation(ctx, document, allComments, commentData, getNavState())
			),
			Promise.resolve().then(() => inlineReply(ctx, document)),
			Promise.resolve().then(() => replyFocusTextarea(document)),
		]);
	},
};
