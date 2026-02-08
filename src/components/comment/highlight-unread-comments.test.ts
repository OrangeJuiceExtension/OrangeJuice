import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	HighlightUnreadCommentsService,
	ojReadCommentsKey,
} from '@/services/highlight-unread-comments-service.ts';
import { createClientServices, type ServicesManager } from '@/services/manager.ts';
import { dom } from '@/utils/dom.ts';
import lStorage from '@/utils/local-storage.ts';
import type { ReadCommentsList } from './highlight-unread-comments.ts';
import { highlightUnreadComments } from './highlight-unread-comments.ts';

describe('highlightUnreadComments', () => {
	let mockDoc: Document;
	let manager: ServicesManager;
	let service: HighlightUnreadCommentsService;

	beforeEach(() => {
		mockDoc = document.implementation.createHTMLDocument('test');
		lStorage.clear();
		vi.clearAllMocks();
		manager = createClientServices();
		service = new HighlightUnreadCommentsService();
		manager.getHighlightService = () => service;
	});

	describe('style injection', () => {
		it('should inject custom styles into document head', async () => {
			vi.spyOn(dom, 'getItemIdFromLocation').mockReturnValue('123');
			mockDoc.body.innerHTML =
				'<table class="fatitem"><tr><td><form action=""></form></td></tr></table>';

			await highlightUnreadComments(mockDoc, [], manager);

			const styleElement = mockDoc.head.querySelector('style');
			expect(styleElement).toBeTruthy();
			expect(styleElement?.textContent).toContain('oj_new_comment_indent');
		});

		it('should add hover styles for new comment indent', async () => {
			vi.spyOn(dom, 'getItemIdFromLocation').mockReturnValue('123');
			mockDoc.body.innerHTML =
				'<table class="fatitem"><tr><td><form action=""></form></td></tr></table>';

			await highlightUnreadComments(mockDoc, [], manager);

			const styleElement = mockDoc.head.querySelector('style');
			expect(styleElement?.textContent).toContain('.oj_new_comment_indent:hover');
			expect(styleElement?.textContent).toContain('box-shadow: inset -3px 0 #f6b391');
			expect(styleElement?.textContent).toContain('box-shadow: inset -3px 0 #ff6000');
		});

		it('should add collapsed comment indent styles', async () => {
			vi.spyOn(dom, 'getItemIdFromLocation').mockReturnValue('123');
			mockDoc.body.innerHTML =
				'<table class="fatitem"><tr><td><form action=""></form></td></tr></table>';

			await highlightUnreadComments(mockDoc, [], manager);

			const styleElement = mockDoc.head.querySelector('style');
			expect(styleElement?.textContent).toContain('.coll .oj_new_clickable_indent');
		});
	});

	describe('early returns', () => {
		it('should return early if readCommentsList is null', async () => {
			vi.spyOn(lStorage, 'getItem').mockResolvedValue(null);

			const comments = [createComment(mockDoc, 'comment1')];
			await highlightUnreadComments(mockDoc, comments, manager);

			const commentElement = mockDoc.getElementById('comment1');
			const indentCell = commentElement?.querySelector('td.ind');
			expect(indentCell?.classList.contains('oj_new_comment_indent')).toBe(false);
		});

		it('should return early if reply form is not present', async () => {
			vi.spyOn(dom, 'getItemIdFromLocation').mockReturnValue('123');
			vi.spyOn(lStorage, 'getItem').mockResolvedValue({});

			const comments = [createComment(mockDoc, 'comment1')];
			await highlightUnreadComments(mockDoc, comments, manager);

			const commentElement = mockDoc.getElementById('comment1');
			const indentCell = commentElement?.querySelector('td.ind');
			expect(indentCell?.classList.contains('oj_new_comment_indent')).toBe(false);
		});

		it('should return early if itemId is not found', async () => {
			vi.spyOn(dom, 'getItemIdFromLocation').mockReturnValue(null);
			vi.spyOn(lStorage, 'getItem').mockResolvedValue({});
			mockDoc.body.innerHTML =
				'<table class="fatitem"><tr><td><form action=""></form></td></tr></table>';

			const comments = [createComment(mockDoc, 'comment1')];
			await highlightUnreadComments(mockDoc, comments, manager);

			const commentElement = mockDoc.getElementById('comment1');
			const indentCell = commentElement?.querySelector('td.ind');
			expect(indentCell?.classList.contains('oj_new_comment_indent')).toBe(false);
		});
	});

	describe('highlight new comments', () => {
		it('should highlight new comments that were not previously read', async () => {
			const THREE_DAYS_IN_MS = 3 * 24 * 60 * 60 * 1000;
			const readCommentsList: ReadCommentsList = {
				'123': {
					expiry: Date.now() + THREE_DAYS_IN_MS,
					comments: ['comment1'],
				},
			};

			vi.spyOn(dom, 'getItemIdFromLocation').mockReturnValue('123');
			vi.spyOn(lStorage, 'getItem').mockResolvedValue(readCommentsList);
			vi.spyOn(service, 'expireOldComments').mockResolvedValue(undefined);

			mockDoc.body.innerHTML =
				'<table class="fatitem"><tr><td><form action=""></form></td></tr></table>';
			const comments = [
				createComment(mockDoc, 'comment1'),
				createComment(mockDoc, 'comment2'),
			];

			await highlightUnreadComments(mockDoc, comments, manager);

			const comment1 = mockDoc.getElementById('comment1');
			const comment2 = mockDoc.getElementById('comment2');

			expect(
				comment1?.querySelector('td.ind')?.classList.contains('oj_new_comment_indent')
			).toBe(false);
			expect(
				comment2?.querySelector('td.ind')?.classList.contains('oj_new_comment_indent')
			).toBe(true);
		});

		it('should not highlight comments if no read comments exist', async () => {
			const readCommentsList: ReadCommentsList = {
				'123': {
					expiry: Date.now() + 3 * 24 * 60 * 60 * 1000,
					comments: [],
				},
			};

			vi.spyOn(dom, 'getItemIdFromLocation').mockReturnValue('123');
			vi.spyOn(lStorage, 'getItem').mockResolvedValue(readCommentsList);
			vi.spyOn(service, 'expireOldComments').mockResolvedValue(undefined);

			mockDoc.body.innerHTML = '<table class="fatitem"><form></form></table>';
			const comments = [createComment(mockDoc, 'comment1')];

			await highlightUnreadComments(mockDoc, comments, manager);

			const comment1 = mockDoc.getElementById('comment1');
			expect(
				comment1?.querySelector('td.ind')?.classList.contains('oj_new_comment_indent')
			).toBe(false);
		});

		it('should handle multiple new comments', async () => {
			const readCommentsList: ReadCommentsList = {
				'123': {
					expiry: Date.now() + 3 * 24 * 60 * 60 * 1000,
					comments: ['comment1'],
				},
			};

			vi.spyOn(dom, 'getItemIdFromLocation').mockReturnValue('123');
			vi.spyOn(lStorage, 'getItem').mockResolvedValue(readCommentsList);
			vi.spyOn(service, 'expireOldComments').mockResolvedValue(undefined);

			mockDoc.body.innerHTML =
				'<table class="fatitem"><tr><td><form action=""></form></td></tr></table>';
			const comments = [
				createComment(mockDoc, 'comment1'),
				createComment(mockDoc, 'comment2'),
				createComment(mockDoc, 'comment3'),
			];

			await highlightUnreadComments(mockDoc, comments, manager);

			const comment1 = mockDoc.getElementById('comment1');
			const comment2 = mockDoc.getElementById('comment2');
			const comment3 = mockDoc.getElementById('comment3');

			expect(
				comment1?.querySelector('td.ind')?.classList.contains('oj_new_comment_indent')
			).toBe(false);
			expect(
				comment2?.querySelector('td.ind')?.classList.contains('oj_new_comment_indent')
			).toBe(true);
			expect(
				comment3?.querySelector('td.ind')?.classList.contains('oj_new_comment_indent')
			).toBe(true);
		});

		it('should handle comment element not found in DOM', async () => {
			const readCommentsList: ReadCommentsList = {
				'123': {
					expiry: Date.now() + 3 * 24 * 60 * 60 * 1000,
					comments: ['comment1'],
				},
			};

			vi.spyOn(dom, 'getItemIdFromLocation').mockReturnValue('123');
			vi.spyOn(lStorage, 'getItem').mockResolvedValue(readCommentsList);
			vi.spyOn(service, 'expireOldComments').mockResolvedValue(undefined);

			mockDoc.body.innerHTML = '<table class="fatitem"><form></form></table>';

			// Create comment object but don't add to document
			const comment = mockDoc.createElement('tr');
			comment.id = 'comment2';

			await highlightUnreadComments(mockDoc, [comment], manager);

			// Should not throw error
			expect(mockDoc.getElementById('comment2')).toBeNull();
		});
	});

	describe('storage updates', () => {
		it('should save current comments to storage', async () => {
			const readCommentsList: ReadCommentsList = {};
			const setItemSpy = vi.spyOn(lStorage, 'setItem');

			vi.spyOn(dom, 'getItemIdFromLocation').mockReturnValue('123');
			vi.spyOn(lStorage, 'getItem').mockResolvedValue(readCommentsList);
			vi.spyOn(service, 'expireOldComments').mockResolvedValue(undefined);

			mockDoc.body.innerHTML =
				'<table class="fatitem"><tr><td><form action=""></form></td></tr></table>';
			const comments = [
				createComment(mockDoc, 'comment1'),
				createComment(mockDoc, 'comment2'),
			];

			await highlightUnreadComments(mockDoc, comments, manager);

			expect(setItemSpy).toHaveBeenCalledWith(
				ojReadCommentsKey,
				expect.objectContaining({
					'123': expect.objectContaining({
						comments: expect.arrayContaining(['comment1', 'comment2']),
					}),
				})
			);
		});

		it('should merge new comments with existing read comments', async () => {
			const readCommentsList: ReadCommentsList = {
				'123': {
					expiry: Date.now() + 3 * 24 * 60 * 60 * 1000,
					comments: ['comment1'],
				},
			};
			const setItemSpy = vi.spyOn(lStorage, 'setItem');

			vi.spyOn(dom, 'getItemIdFromLocation').mockReturnValue('123');
			vi.spyOn(lStorage, 'getItem').mockResolvedValue(readCommentsList);
			vi.spyOn(service, 'expireOldComments').mockResolvedValue(undefined);

			mockDoc.body.innerHTML =
				'<table class="fatitem"><tr><td><form action=""></form></td></tr></table>';
			const comments = [
				createComment(mockDoc, 'comment1'),
				createComment(mockDoc, 'comment2'),
			];

			await highlightUnreadComments(mockDoc, comments, manager);

			expect(setItemSpy).toHaveBeenCalledWith(
				ojReadCommentsKey,
				expect.objectContaining({
					'123': expect.objectContaining({
						comments: expect.arrayContaining(['comment1', 'comment2']),
					}),
				})
			);
		});

		it('should deduplicate comments in storage', async () => {
			const readCommentsList: ReadCommentsList = {
				'123': {
					expiry: Date.now() + 3 * 24 * 60 * 60 * 1000,
					comments: ['comment1', 'comment2'],
				},
			};
			const setItemSpy = vi.spyOn(lStorage, 'setItem');

			vi.spyOn(dom, 'getItemIdFromLocation').mockReturnValue('123');
			vi.spyOn(lStorage, 'getItem').mockResolvedValue(readCommentsList);
			vi.spyOn(service, 'expireOldComments').mockResolvedValue(undefined);

			mockDoc.body.innerHTML =
				'<table class="fatitem"><tr><td><form action=""></form></td></tr></table>';
			const comments = [
				createComment(mockDoc, 'comment1'),
				createComment(mockDoc, 'comment2'),
			];

			await highlightUnreadComments(mockDoc, comments, manager);

			const savedData = setItemSpy.mock.calls[0][1] as ReadCommentsList;
			const savedComments = savedData['123'].comments;

			// Should not have duplicates
			expect(savedComments.length).toBe(2);
			expect(new Set(savedComments).size).toBe(2);
		});

		it('should preserve expiry from existing item data', async () => {
			const existingExpiry = Date.now() + 3 * 24 * 60 * 60 * 1000;
			const readCommentsList: ReadCommentsList = {
				'123': {
					expiry: existingExpiry,
					comments: ['comment1'],
				},
			};
			const setItemSpy = vi.spyOn(lStorage, 'setItem');

			vi.spyOn(dom, 'getItemIdFromLocation').mockReturnValue('123');
			vi.spyOn(lStorage, 'getItem').mockResolvedValue(readCommentsList);
			vi.spyOn(service, 'expireOldComments').mockResolvedValue(undefined);

			mockDoc.body.innerHTML =
				'<table class="fatitem"><tr><td><form action=""></form></td></tr></table>';
			const comments = [createComment(mockDoc, 'comment1')];

			await highlightUnreadComments(mockDoc, comments, manager);

			const savedData = setItemSpy.mock.calls[0][1] as ReadCommentsList;
			expect(savedData['123'].expiry).toBe(existingExpiry);
		});

		it('should create new expiry for new items', async () => {
			vi.useFakeTimers();
			const now = 1_000_000;
			vi.setSystemTime(now);

			const THREE_DAYS_IN_MS = 3 * 24 * 60 * 60 * 1000;
			const readCommentsList: ReadCommentsList = {};
			const setItemSpy = vi.spyOn(lStorage, 'setItem');

			vi.spyOn(dom, 'getItemIdFromLocation').mockReturnValue('123');
			vi.spyOn(lStorage, 'getItem').mockResolvedValue(readCommentsList);
			vi.spyOn(service, 'expireOldComments').mockResolvedValue(undefined);

			mockDoc.body.innerHTML =
				'<table class="fatitem"><tr><td><form action=""></form></td></tr></table>';
			const comments = [createComment(mockDoc, 'comment1')];

			await highlightUnreadComments(mockDoc, comments, manager);

			const savedData = setItemSpy.mock.calls[0][1] as ReadCommentsList;
			expect(savedData['123'].expiry).toBe(now + THREE_DAYS_IN_MS);

			vi.useRealTimers();
		});
	});

	describe('service integration', () => {
		it('should call expireOldComments service', async () => {
			const readCommentsList: ReadCommentsList = {
				'123': {
					expiry: Date.now() + 3 * 24 * 60 * 60 * 1000,
					comments: [],
				},
			};
			const expireSpy = vi.spyOn(service, 'expireOldComments').mockResolvedValue(undefined);

			vi.spyOn(dom, 'getItemIdFromLocation').mockReturnValue('123');
			vi.spyOn(lStorage, 'getItem').mockResolvedValue(readCommentsList);

			mockDoc.body.innerHTML =
				'<table class="fatitem"><tr><td><form action=""></form></td></tr></table>';
			await highlightUnreadComments(mockDoc, [], manager);

			expect(expireSpy).toHaveBeenCalledWith(readCommentsList);
		});
	});

	describe('edge cases', () => {
		it('should handle empty comments array', async () => {
			const readCommentsList: ReadCommentsList = {
				'123': {
					expiry: Date.now() + 3 * 24 * 60 * 60 * 1000,
					comments: [],
				},
			};
			const setItemSpy = vi.spyOn(lStorage, 'setItem');

			vi.spyOn(dom, 'getItemIdFromLocation').mockReturnValue('123');
			vi.spyOn(lStorage, 'getItem').mockResolvedValue(readCommentsList);
			vi.spyOn(service, 'expireOldComments').mockResolvedValue(undefined);

			mockDoc.body.innerHTML =
				'<table class="fatitem"><tr><td><form action=""></form></td></tr></table>';

			await highlightUnreadComments(mockDoc, [], manager);

			expect(setItemSpy).toHaveBeenCalled();
		});

		it('should handle comments without indent cell', async () => {
			const readCommentsList: ReadCommentsList = {
				'123': {
					expiry: Date.now() + 3 * 24 * 60 * 60 * 1000,
					comments: [],
				},
			};

			vi.spyOn(dom, 'getItemIdFromLocation').mockReturnValue('123');
			vi.spyOn(lStorage, 'getItem').mockResolvedValue(readCommentsList);
			vi.spyOn(service, 'expireOldComments').mockResolvedValue(undefined);

			mockDoc.body.innerHTML =
				'<table class="fatitem"><tr><td><form action=""></form></td></tr></table>';
			const comment = mockDoc.createElement('tr');
			comment.id = 'comment1';
			mockDoc.body.appendChild(comment);

			await expect(
				highlightUnreadComments(mockDoc, [comment], manager)
			).resolves.not.toThrow();
		});

		it('should handle item without existing data', async () => {
			const readCommentsList: ReadCommentsList = {};
			const setItemSpy = vi.spyOn(lStorage, 'setItem');

			vi.spyOn(dom, 'getItemIdFromLocation').mockReturnValue('123');
			vi.spyOn(lStorage, 'getItem').mockResolvedValue(readCommentsList);
			vi.spyOn(service, 'expireOldComments').mockResolvedValue(undefined);

			mockDoc.body.innerHTML =
				'<table class="fatitem"><tr><td><form action=""></form></td></tr></table>';
			const comments = [createComment(mockDoc, 'comment1')];

			await highlightUnreadComments(mockDoc, comments, manager);

			const savedData = setItemSpy.mock.calls[0][1] as ReadCommentsList;
			expect(savedData['123']).toBeTruthy();
			expect(savedData['123'].comments).toEqual(['comment1']);
		});
	});
});

function createComment(doc: Document, id: string): HTMLElement {
	const indentCell = doc.createElement('td');
	indentCell.className = 'ind';

	const comment = doc.createElement('tr');
	comment.id = id;
	comment.appendChild(indentCell);

	doc.body.appendChild(comment);

	return comment;
}
