import type { ReadCommentsList } from '@/components/comment/highlight-unread-comments.ts';
import lStorage from '@/utils/local-storage.ts';

export const ojReadCommentsKey = 'oj_read_comments';

export class HighlightUnreadCommentsService {
	async expireOldComments(readCommentsList: ReadCommentsList) {
		try {
			const currentMilliseconds = Date.now();
			let hasChanges = false;

			for (const [id, itemObj] of Object.entries(readCommentsList)) {
				if (itemObj.expiry <= currentMilliseconds) {
					delete readCommentsList[id];
					hasChanges = true;
				}
			}

			if (hasChanges) {
				await lStorage.setItem<ReadCommentsList>(ojReadCommentsKey, readCommentsList);
			}
		} catch (e) {
			console.error({ error: 'error in expireOldComments', e });
		}
	}
}
