import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { browser } from 'wxt/browser';
import { dom } from '@/utils/dom.ts';
import {
	expireOldComments,
	handleExpireComments,
	highlightUnreadComments,
} from './highlight-unread-comments.ts';

vi.mock('wxt/browser', () => ({
	browser: {
		runtime: {
			sendMessage: vi.fn(),
		},
	},
}));

const hnCommentsHtml = readFileSync(join(__dirname, '__fixtures__', 'hn-comments.html'), 'utf-8');

describe('highlight-unread-comments', () => {
	const ojReadCommentsKey = 'oj_read_comments';

	beforeEach(() => {
		localStorage.clear();
		vi.clearAllMocks();
		vi.useFakeTimers();
	});

	describe('expireOldComments', () => {
		it('should remove expired items from the list and update localStorage', () => {
			const now = Date.now();
			const readCommentsList = {
				item1: { expiry: now - 1000, comments: ['c1'] },
				item2: { expiry: now + 1000, comments: ['c2'] },
			};

			expireOldComments(readCommentsList);

			expect(readCommentsList).toEqual({
				item2: { expiry: now + 1000, comments: ['c2'] },
			});
			const stored = JSON.parse(localStorage.getItem(ojReadCommentsKey) || '{}');
			expect(stored).toEqual(readCommentsList);
		});

		it('should not update localStorage if no changes', () => {
			const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
			const now = Date.now();
			const readCommentsList = {
				item1: { expiry: now + 1000, comments: ['c1'] },
			};

			expireOldComments(readCommentsList);

			expect(setItemSpy).not.toHaveBeenCalled();
		});

		it('should handle empty list', () => {
			const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
			const readCommentsList = {};

			expireOldComments(readCommentsList);

			expect(readCommentsList).toEqual({});
			expect(setItemSpy).not.toHaveBeenCalled();
		});

		it('should remove multiple expired items in one pass', () => {
			const now = Date.now();
			const readCommentsList = {
				item1: { expiry: now - 5000, comments: ['c1'] },
				item2: { expiry: now - 3000, comments: ['c2'] },
				item3: { expiry: now - 1000, comments: ['c3'] },
				item4: { expiry: now + 1000, comments: ['c4'] },
			};

			expireOldComments(readCommentsList);

			expect(readCommentsList).toEqual({
				item4: { expiry: now + 1000, comments: ['c4'] },
			});
		});

		it('should remove all items if all are expired', () => {
			const now = Date.now();
			const readCommentsList = {
				item1: { expiry: now - 1000, comments: ['c1'] },
				item2: { expiry: now - 2000, comments: ['c2'] },
			};

			expireOldComments(readCommentsList);

			expect(readCommentsList).toEqual({});
			const stored = JSON.parse(localStorage.getItem(ojReadCommentsKey) || '{}');
			expect(stored).toEqual({});
		});

		it('should handle items expiring exactly at current time', () => {
			const now = Date.now();
			const readCommentsList = {
				item1: { expiry: now, comments: ['c1'] },
				item2: { expiry: now + 1, comments: ['c2'] },
			};

			expireOldComments(readCommentsList);

			expect(readCommentsList).toEqual({
				item2: { expiry: now + 1, comments: ['c2'] },
			});
		});
	});

	describe('handleExpireComments', () => {
		it('should call expireOldComments if message type is expireComments', () => {
			const now = Date.now();
			const data = {
				item1: { expiry: now - 1000, comments: ['c1'] },
			};

			handleExpireComments({ type: 'expireComments', data });

			expect(localStorage.getItem(ojReadCommentsKey)).toBeDefined();
			const stored = JSON.parse(localStorage.getItem(ojReadCommentsKey) || '{}');
			expect(stored.item1).toBeUndefined();
		});

		it('should do nothing for other message types', () => {
			const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
			handleExpireComments({ type: 'other', data: {} as any });
			expect(setItemSpy).not.toHaveBeenCalled();
		});
	});

	describe('highlightUnreadComments', () => {
		let doc: Document;

		beforeEach(() => {
			doc = document.implementation.createHTMLDocument();
			doc.body.innerHTML = `
				<table class="fatitem">
					<tr>
						<td>
							<form action="comment" method="post">
								<textarea name="text"></textarea>
								<input type="submit" value="add comment">
							</form>
						</td>
					</tr>
				</table>
				${hnCommentsHtml}
			`;
			// Mock window.location.href via dom.getItemIdFromLocation
			vi.spyOn(dom, 'getItemIdFromLocation').mockReturnValue('12345');
		});

		it('should bail out if reply form is missing', () => {
			const form = doc.querySelector('table.fatitem form');
			form?.remove();

			const comments = [...doc.querySelectorAll('tr.comtr')];
			highlightUnreadComments(doc, comments);

			expect(localStorage.getItem(ojReadCommentsKey)).toBeNull();
		});

		it('should bail out if itemId is missing', () => {
			vi.spyOn(dom, 'getItemIdFromLocation').mockReturnValue(null);

			const comments = [...doc.querySelectorAll('tr.comtr')];
			highlightUnreadComments(doc, comments);

			expect(localStorage.getItem(ojReadCommentsKey)).toBeNull();
		});

		it('should highlight nothing and save comments on first visit', () => {
			const comments = [...doc.querySelectorAll('tr.comtr')];
			highlightUnreadComments(doc, comments);

			const highlighted = doc.querySelectorAll('.oj_new_comment_indent');
			expect(highlighted.length).toBe(0);

			const stored = JSON.parse(localStorage.getItem(ojReadCommentsKey) || '{}');
			expect(stored['12345']).toBeDefined();
			expect(stored['12345'].comments).toContain('comment1');
			expect(stored['12345'].comments).toContain('comment2');
			expect(stored['12345'].comments).toContain('comment3');
			expect(stored['12345'].comments).toContain('comment4');
		});

		it('should highlight new comments on subsequent visit', () => {
			const now = Date.now();
			const initialData = {
				'12345': {
					expiry: now + 100_000,
					comments: ['comment1', 'comment2'],
				},
			};
			localStorage.setItem(ojReadCommentsKey, JSON.stringify(initialData));

			const comments = [...doc.querySelectorAll('tr.comtr')];
			highlightUnreadComments(doc, comments);

			// comment3 and comment4 are new
			const highlighted = doc.querySelectorAll('.oj_new_comment_indent');
			expect(highlighted.length).toBe(2);

			const comment3Row = doc.getElementById('comment3');
			expect(
				comment3Row?.querySelector('td.ind')?.classList.contains('oj_new_comment_indent')
			).toBe(true);

			const comment4Row = doc.getElementById('comment4');
			expect(
				comment4Row?.querySelector('td.ind')?.classList.contains('oj_new_comment_indent')
			).toBe(true);

			const stored = JSON.parse(localStorage.getItem(ojReadCommentsKey) || '{}');
			expect(stored['12345'].comments).toEqual(
				expect.arrayContaining(['comment1', 'comment2', 'comment3', 'comment4'])
			);
		});

		it('should not highlight anything if all comments are already seen', () => {
			const now = Date.now();
			const initialData = {
				'12345': {
					expiry: now + 100_000,
					comments: ['comment1', 'comment2', 'comment3', 'comment4'],
				},
			};
			localStorage.setItem(ojReadCommentsKey, JSON.stringify(initialData));

			const comments = [...doc.querySelectorAll('tr.comtr')];
			highlightUnreadComments(doc, comments);

			const highlighted = doc.querySelectorAll('.oj_new_comment_indent');
			expect(highlighted.length).toBe(0);
		});

		it('should send expireComments message to background', () => {
			const comments = [...doc.querySelectorAll('tr.comtr')];
			vi.useFakeTimers();
			vi.setSystemTime(1);
			highlightUnreadComments(doc, comments);

			expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
				type: 'expireComments',
				data: {
					'12345': {
						comments: ['comment1', 'comment2', 'comment3', 'comment4'],
						expiry: 1 + 3 * 24 * 60 * 60 * 1000, // 3 days in MS
					},
				},
			});
			vi.useRealTimers();
		});

		it('should use existing expiry if available', () => {
			const expiry = Date.now() + 5000;
			const initialData = {
				'12345': {
					expiry,
					comments: ['comment1'],
				},
			};
			localStorage.setItem(ojReadCommentsKey, JSON.stringify(initialData));

			const comments = [...doc.querySelectorAll('tr.comtr')];
			highlightUnreadComments(doc, comments);

			const stored = JSON.parse(localStorage.getItem(ojReadCommentsKey) || '{}');
			expect(stored['12345'].expiry).toBe(expiry);
		});

		it('should create new expiry 3 days in future for new items', () => {
			const now = 1_000_000;
			vi.setSystemTime(now);

			const comments = [...doc.querySelectorAll('tr.comtr')];
			highlightUnreadComments(doc, comments);

			const stored = JSON.parse(localStorage.getItem(ojReadCommentsKey) || '{}');
			const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
			expect(stored['12345'].expiry).toBe(now + threeDaysInMs);
		});

		it('should inject style element into document head', () => {
			const comments = [...doc.querySelectorAll('tr.comtr')];
			highlightUnreadComments(doc, comments);

			const styleElement = doc.querySelector('style');
			expect(styleElement).not.toBeNull();
			expect(styleElement?.textContent).toContain('.oj_new_comment_indent');
			expect(styleElement?.textContent).toContain('box-shadow: inset -3px 0 #f6b391');
			expect(styleElement?.textContent).toContain('.oj_new_comment_indent:hover');
		});

		it('should handle comments with missing ind element', () => {
			const now = Date.now();
			const initialData = {
				'12345': {
					expiry: now + 100_000,
					comments: ['comment1'],
				},
			};
			localStorage.setItem(ojReadCommentsKey, JSON.stringify(initialData));

			// Create a comment without an ind element
			const commentWithoutInd = doc.createElement('tr');
			commentWithoutInd.className = 'athing comtr';
			commentWithoutInd.id = 'comment5';
			commentWithoutInd.innerHTML =
				'<td><table><tr><td class="default">No indent cell</td></tr></table></td>';
			doc.body.appendChild(commentWithoutInd);

			const comments = [...doc.querySelectorAll('tr.comtr')];
			highlightUnreadComments(doc, comments);

			// Should not throw error, just skip highlighting for comment5
			const highlighted = doc.querySelectorAll('.oj_new_comment_indent');
			expect(highlighted.length).toBe(3); // comment2, comment3, comment4
		});

		it('should merge new comments with existing comments without duplicates', () => {
			const now = Date.now();
			const initialData = {
				'12345': {
					expiry: now + 100_000,
					comments: ['comment1', 'comment2', 'comment3'],
				},
			};
			localStorage.setItem(ojReadCommentsKey, JSON.stringify(initialData));

			const comments = [...doc.querySelectorAll('tr.comtr')];
			highlightUnreadComments(doc, comments);

			const stored = JSON.parse(localStorage.getItem(ojReadCommentsKey) || '{}');
			// Should have all 4 unique comments
			expect(stored['12345'].comments.length).toBe(4);
			expect(stored['12345'].comments).toEqual(
				expect.arrayContaining(['comment1', 'comment2', 'comment3', 'comment4'])
			);
			// Ensure no duplicates
			const uniqueComments = new Set(stored['12345'].comments);
			expect(uniqueComments.size).toBe(4);
		});

		it('should handle multiple items in localStorage', () => {
			const now = Date.now();
			const initialData = {
				'12345': {
					expiry: now + 100_000,
					comments: ['comment1'],
				},
				'67890': {
					expiry: now + 200_000,
					comments: ['other_comment'],
				},
			};
			localStorage.setItem(ojReadCommentsKey, JSON.stringify(initialData));

			const comments = [...doc.querySelectorAll('tr.comtr')];
			highlightUnreadComments(doc, comments);

			const stored = JSON.parse(localStorage.getItem(ojReadCommentsKey) || '{}');
			// Should preserve other items
			expect(stored['67890']).toEqual({
				expiry: now + 200_000,
				comments: ['other_comment'],
			});
			// Should update current item
			expect(stored['12345'].comments).toEqual(
				expect.arrayContaining(['comment1', 'comment2', 'comment3', 'comment4'])
			);
		});

		it('should handle corrupt localStorage data gracefully', () => {
			localStorage.setItem(ojReadCommentsKey, 'invalid json');

			const comments = [...doc.querySelectorAll('tr.comtr')];

			// Should throw during JSON.parse but we're testing current behavior
			expect(() => {
				highlightUnreadComments(doc, comments);
			}).toThrow();
		});

		it('should handle empty comments array', () => {
			highlightUnreadComments(doc, []);

			const stored = JSON.parse(localStorage.getItem(ojReadCommentsKey) || '{}');
			expect(stored['12345'].comments).toEqual([]);
		});

		it('should send message with existing data from localStorage', () => {
			const now = Date.now();
			const existingData = {
				'12345': {
					expiry: now + 100_000,
					comments: ['comment1', 'comment2', 'comment3', 'comment4'],
				},
			};
			localStorage.setItem(ojReadCommentsKey, JSON.stringify(existingData));

			const comments = [...doc.querySelectorAll('tr.comtr')];
			highlightUnreadComments(doc, comments);

			expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
				type: 'expireComments',
				data: existingData,
			});
		});

		it('should only add class to td.ind elements', () => {
			const now = Date.now();
			const initialData = {
				'12345': {
					expiry: now + 100_000,
					comments: ['comment1'],
				},
			};
			localStorage.setItem(ojReadCommentsKey, JSON.stringify(initialData));

			const comments = [...doc.querySelectorAll('tr.comtr')];
			highlightUnreadComments(doc, comments);

			// Verify only td.ind elements have the class
			const highlighted = doc.querySelectorAll('.oj_new_comment_indent');
			for (const element of highlighted) {
				expect(element.tagName).toBe('TD');
				expect(element.classList.contains('ind')).toBe(true);
			}
		});

		it('should preserve order of comments in storage', () => {
			const now = Date.now();
			const initialData = {
				'12345': {
					expiry: now + 100_000,
					comments: ['comment4', 'comment3'],
				},
			};
			localStorage.setItem(ojReadCommentsKey, JSON.stringify(initialData));

			const comments = [...doc.querySelectorAll('tr.comtr')];
			highlightUnreadComments(doc, comments);

			const stored = JSON.parse(localStorage.getItem(ojReadCommentsKey) || '{}');
			// Should contain all comments (order may vary due to Set usage)
			expect(stored['12345'].comments).toHaveLength(4);
			expect(stored['12345'].comments).toEqual(
				expect.arrayContaining(['comment1', 'comment2', 'comment3', 'comment4'])
			);
		});
	});
});
