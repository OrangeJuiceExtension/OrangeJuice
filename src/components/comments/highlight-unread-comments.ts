import { browser } from 'wxt/browser';
import { dom } from '@/utils/dom.ts';

const THREE_DAYS_IN_MS = 3 * 24 * 60 * 60 * 1000;

interface ReadCommentItem {
	expiry: number;
	comments: string[];
}

interface ReadCommentsList {
	[itemId: string]: ReadCommentItem;
}

const ojReadCommentsKey = 'oj_read_comments';

export const expireOldComments = (readCommentsList: ReadCommentsList) => {
	const currentMilliseconds = Date.now();
	let hasChanges = false;

	for (const [id, itemObj] of Object.entries(readCommentsList)) {
		if (itemObj.expiry <= currentMilliseconds) {
			delete readCommentsList[id];
			hasChanges = true;
		}
	}

	if (hasChanges) {
		localStorage.setItem(ojReadCommentsKey, JSON.stringify(readCommentsList));
	}
};

export const handleExpireComments = (message: { type: string; data: ReadCommentsList }) => {
	if (message.type === 'expireComments') {
		expireOldComments(message.data);
	}
};

export const highlightUnreadComments = (doc: Document, comments: Element[]) => {
	const style = doc.createElement('style');
	style.textContent = `
		.oj_new_comment_indent {
			box-shadow: inset -3px 0 #f6b391;
		}
		
		.oj_new_comment_indent:hover {
			box-shadow: inset -3px 0 #ff6000;
		}
	`;
	doc.head.appendChild(style);

	const storageData = localStorage.getItem(ojReadCommentsKey);
	let readCommentsList: ReadCommentsList = {};

	if (storageData) {
		readCommentsList = JSON.parse(storageData) as ReadCommentsList;
	}

	// offload to background, we shouldn't need the expired data to be updated
	browser.runtime.sendMessage({ type: 'expireComments', data: readCommentsList });

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
				commentElement.querySelector('td.ind')?.classList.add('oj_new_comment_indent');
			}
		}
	}

	readCommentsList[itemId] = {
		expiry: itemData.expiry || Date.now() + THREE_DAYS_IN_MS,
		comments: [...new Set([...currentComments, ...readComments])],
	} as ReadCommentItem;

	localStorage.setItem(ojReadCommentsKey, JSON.stringify(readCommentsList));
};
