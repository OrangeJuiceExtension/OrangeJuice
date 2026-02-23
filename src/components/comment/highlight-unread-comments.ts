import { ojReadCommentsKey } from '@/services/highlight-unread-comments-service.ts';
import type { ServicesManager } from '@/services/manager.ts';
import { dom } from '@/utils/dom.ts';
import lStorage from '@/utils/local-storage.ts';
import { OJ_NEW_CLICKABLE_INDENT, OJ_NEW_COMMENT_INDENT } from './constants.ts';

const THREE_DAYS_IN_MS = 3 * 24 * 60 * 60 * 1000;

interface ReadCommentItem {
	comments: string[];
	expiry: number;
}

export interface ReadCommentsList {
	[itemId: string]: ReadCommentItem;
}

export const highlightUnreadComments = async (
	doc: Document,
	comments: HTMLElement[],
	manager: ServicesManager
) => {
	const style = doc.createElement('style');
	style.textContent = `
		.${OJ_NEW_COMMENT_INDENT} {
			box-shadow: inset -3px 0 #f6b391 !important;
		}

		html.oj-dark-mode .${OJ_NEW_COMMENT_INDENT} {
			box-shadow: inset -3px 0 #ffd5a3 !important;
		}
		
		.${OJ_NEW_COMMENT_INDENT}:hover {
			box-shadow: inset -3px 0 #ff6000 !important;
		}

		.coll .${OJ_NEW_CLICKABLE_INDENT} {
			box-shadow: inset -3px 0 #ff6000 !important;
		}
	`;
	doc.head.appendChild(style);

	const readCommentsList = await lStorage.getItem<ReadCommentsList>(ojReadCommentsKey, {
		fallback: {},
	});
	if (!readCommentsList) {
		return;
	}

	await manager.getHighlightService().expireOldComments(readCommentsList);

	// If the item is so old that one cannot reply, there is no point in storing comments
	const replyForm = doc.querySelector<HTMLFormElement>('table.fatitem form');
	if (!replyForm) {
		return;
	}

	// /item?id=
	const itemId = dom.getItemIdFromLocation();
	if (!itemId) {
		return;
	}

	const currentComments: string[] = [];
	for (const comment of comments) {
		currentComments.push(comment.id);
	}

	const itemData = readCommentsList[itemId] || {};
	const readComments = itemData.comments || [];

	if (readComments.length > 0) {
		const newComments = currentComments.filter((id) => !readComments.includes(id));

		for (const commentId of newComments) {
			const commentElement = doc.getElementById(commentId);
			if (commentElement) {
				commentElement.querySelector('td.ind')?.classList.add(OJ_NEW_COMMENT_INDENT);
			}
		}
	}

	readCommentsList[itemId] = {
		expiry: itemData.expiry || Date.now() + THREE_DAYS_IN_MS,
		comments: [...new Set([...currentComments, ...readComments])],
	} as ReadCommentItem;

	await lStorage.setItem<ReadCommentsList>(ojReadCommentsKey, readCommentsList);
};
