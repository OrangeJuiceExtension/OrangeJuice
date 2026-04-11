import type { HNComment } from '@/components/comment/hn-comment.ts';
import { getMutedUsers } from '@/utils/muted-users.ts';

export const OJ_MUTED_COMMENT = 'oj_muted_comment';

const MUTED_COMMENT_STYLE_ID = 'oj-muted-comment-style';
const MUTED_COMMENT_COLOR_LIGHT = '#8b8276';
const MUTED_COMMENT_COLOR_DARK = '#9a9082';

const ensureMutedCommentStyles = (doc: Document): void => {
	if (doc.getElementById(MUTED_COMMENT_STYLE_ID)) {
		return;
	}

	const style = doc.createElement('style');
	style.id = MUTED_COMMENT_STYLE_ID;
	style.textContent = `
		:root {
			--oj-muted-comment-color: ${MUTED_COMMENT_COLOR_LIGHT};
		}

		html.oj-dark-mode {
			--oj-muted-comment-color: ${MUTED_COMMENT_COLOR_DARK};
		}

		.${OJ_MUTED_COMMENT} .comment,
		.${OJ_MUTED_COMMENT} .comment *,
		.${OJ_MUTED_COMMENT} .comhead,
		.${OJ_MUTED_COMMENT} .comhead * {
			color: var(--oj-muted-comment-color) !important;
		}

		.${OJ_MUTED_COMMENT} .oj-follow-button,
		.${OJ_MUTED_COMMENT} .oj-follow-icon {
			opacity: 0.55;
		}

		.${OJ_MUTED_COMMENT} code,
		html.oj-dark-mode .${OJ_MUTED_COMMENT} code,
		html.oj-dark-mode .${OJ_MUTED_COMMENT} .comment code {
			color: var(--oj-muted-comment-color) !important;
		}

		html.oj-dark-mode .${OJ_MUTED_COMMENT} .comhead a.hnuser.oj_op,
		html.oj-dark-mode .${OJ_MUTED_COMMENT} .comhead,
		html.oj-dark-mode .${OJ_MUTED_COMMENT} .comhead *,
		html.oj-dark-mode .${OJ_MUTED_COMMENT} .comment,
		html.oj-dark-mode .${OJ_MUTED_COMMENT} .comment *,
		html.oj-dark-mode .${OJ_MUTED_COMMENT} .oj_link_button {
			color: var(--oj-muted-comment-color) !important;
		}
	`;
	doc.head.appendChild(style);
};

export const applyMutedComments = (
	doc: Document,
	comments: readonly HNComment[],
	mutedUsers: readonly string[]
): void => {
	ensureMutedCommentStyles(doc);

	const mutedUsersSet = new Set(mutedUsers);
	for (const comment of comments) {
		const { commentHead, commentRow, commentText } = comment;
		const author = comment.getAuthor();
		const shouldMute = Boolean(
			commentText && commentHead && author && mutedUsersSet.has(author)
		);

		if (shouldMute) {
			commentRow.classList.add(OJ_MUTED_COMMENT);
			commentText?.classList.add(OJ_MUTED_COMMENT);
			commentHead?.classList.add(OJ_MUTED_COMMENT);
			comment.setMuted(true);
			continue;
		}

		commentRow.classList.remove(OJ_MUTED_COMMENT);
		commentText?.classList.remove(OJ_MUTED_COMMENT);
		commentHead?.classList.remove(OJ_MUTED_COMMENT);
		comment.setMuted(false);
	}
};

export const syncMutedComments = async (
	doc: Document,
	comments: readonly HNComment[]
): Promise<void> => {
	const mutedUsers = await getMutedUsers();
	applyMutedComments(doc, comments, mutedUsers);
};
