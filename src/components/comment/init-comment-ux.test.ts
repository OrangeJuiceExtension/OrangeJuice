import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { dom } from '@/utils/dom.ts';
import { initCommentUX } from './init-comment-ux.ts';

const commentsHtml = readFileSync(
	join(import.meta.dirname, '__fixtures__', 'hn-comments.html'),
	'utf-8'
);

describe('initCommentUX', () => {
	let comments: HTMLElement[];
	beforeEach(() => {
		document.body.innerHTML = commentsHtml;
		comments = dom.getAllComments(document);
	});

	describe('style injection', () => {
		it('should inject custom styles into document head', () => {
			initCommentUX(document, comments);

			const styleElement = document.head.querySelector('style');
			expect(styleElement).toBeTruthy();
			expect(styleElement?.textContent).toContain('oj_comment_indent');
			expect(styleElement?.textContent).toContain('oj_op');
		});

		it('should add comment indent styling rules', () => {
			initCommentUX(document, comments);

			const styleElement = document.head.querySelector('style');
			expect(styleElement?.textContent).toContain('box-shadow: inset -1px 0 #ccc');
		});

		it('should add OP styling rules', () => {
			initCommentUX(document, comments);

			const styleElement = document.head.querySelector('style');
			expect(styleElement?.textContent).toContain('color: #ff6000 !important');
		});

		it('should add code block styling rules', () => {
			initCommentUX(document, comments);

			const styleElement = document.head.querySelector('style');
			expect(styleElement?.textContent).toContain('.comment .commtext pre');
			expect(styleElement?.textContent).toContain('background: #e4e4e4');
			expect(styleElement?.textContent).toContain('border-radius: 6px');
		});

		it('should add inline code styling rules', () => {
			initCommentUX(document, comments);

			const styleElement = document.head.querySelector('style');
			expect(styleElement?.textContent).toContain('.comment .commtext *:not(pre) code');
		});
	});

	describe('comment indent styling', () => {
		it('should add indent class to all comment indent cells', () => {
			initCommentUX(document, comments);

			const indentCells = document.querySelectorAll('td.ind');
			for (const cell of indentCells) {
				expect(cell.classList.contains('oj_comment_indent')).toBe(true);
			}
		});

		it('should process all comments', () => {
			initCommentUX(document, comments);

			const c = document.querySelectorAll('tr.athing');
			expect(c.length).toBe(4);
		});
	});

	describe('custom indent width', () => {
		it('should adjust indent width for top-level comments', () => {
			initCommentUX(document, comments);

			const topLevelComment = document.querySelector('#comment1');
			const indentImage = topLevelComment?.querySelector<HTMLImageElement>('td.ind img');

			expect(indentImage?.width).toBe(0);
			expect(indentImage?.dataset.indentLevel).toBe('0');
		});

		it('should adjust indent width for first-level nested comments', () => {
			const customWidth = 40;
			initCommentUX(document, comments);

			const nestedComment = document.querySelector('#comment2');
			const indentImage = nestedComment?.querySelector<HTMLImageElement>('td.ind img');

			expect(indentImage?.width).toBe(customWidth);
			expect(indentImage?.dataset.indentLevel).toBe('1');
		});

		it('should adjust indent width for deeply nested comments', () => {
			const customWidth = 40;
			initCommentUX(document, comments);

			const deeplyNestedComment = document.querySelector('#comment3');
			const indentImage = deeplyNestedComment?.querySelector<HTMLImageElement>('td.ind img');

			expect(indentImage?.width).toBe(customWidth * 2);
			expect(indentImage?.dataset.indentLevel).toBe('2');
		});

		it('should calculate indent level correctly', () => {
			initCommentUX(document, comments);

			const comment1 = document.querySelector<HTMLImageElement>('#comment1 td.ind img');
			const comment2 = document.querySelector<HTMLImageElement>('#comment2 td.ind img');
			const comment3 = document.querySelector<HTMLImageElement>('#comment3 td.ind img');

			expect(comment1?.dataset.indentLevel).toBe('0');
			expect(comment2?.dataset.indentLevel).toBe('1');
			expect(comment3?.dataset.indentLevel).toBe('2');
		});
	});

	describe('OP highlighting', () => {
		it('should highlight OP username', () => {
			initCommentUX(document, comments, 'opauthor');

			const opComment = document.querySelector('#comment1');
			const authorLink = opComment?.querySelector<HTMLAnchorElement>('a.hnuser');

			expect(authorLink?.classList.contains('oj_op')).toBe(true);
			expect(authorLink?.innerText).toContain('[op]');
		});

		it('should not highlight non-OP usernames', () => {
			initCommentUX(document, comments);

			const nonOpComment = document.querySelector('#comment2');
			const authorLink = nonOpComment?.querySelector<HTMLAnchorElement>('a.hnuser');

			expect(authorLink?.classList.contains('oj_op')).toBe(false);
			expect(authorLink?.innerText).not.toContain('[op]');
		});

		it('should handle multiple OP comments', () => {
			initCommentUX(document, comments, 'opauthor');

			const opComments = document.querySelectorAll('a.hnuser.oj_op');
			expect(opComments.length).toBe(1);
			expect(opComments[0].textContent).toContain('opauthor [op]');
		});

		it('should skip comments without author element', () => {
			initCommentUX(document, comments);

			const commentWithoutAuthor = document.querySelector('#comment4');
			expect(commentWithoutAuthor).toBeTruthy();

			const authorLink = commentWithoutAuthor?.querySelector('a.hnuser');
			expect(authorLink).toBeFalsy();
		});
	});

	describe('edge cases', () => {
		it('should handle empty document', () => {
			document.body.innerHTML = '';

			expect(() => initCommentUX(document, comments)).not.toThrow();
		});

		it('should handle document without comments', () => {
			document.body.innerHTML = '<div>No comments here</div>';

			expect(() => initCommentUX(document, comments)).not.toThrow();

			const styleElement = document.head.querySelector('style');
			expect(styleElement).toBeTruthy();
		});

		it('should handle comment without indent image', () => {
			document.body.innerHTML = `
				<tr class="athing comtr" id="test">
					<td>
						<table>
							<tr>
								<td class="ind"></td>
								<td class="default">
									<a href="user?id=testuser" class="hnuser">testuser</a>
								</td>
							</tr>
						</table>
					</td>
				</tr>
			`;

			expect(() => initCommentUX(document, comments, 'testuser')).not.toThrow();
		});

		it('should handle logged out state (no OP)', () => {
			document.body.innerHTML = `
				<table id="hnmain">
					<tr class="athing comtr" id="comment1">
						<td>
							<table>
								<tr>
									<td class="ind"><img src="s.gif" height="1" width="0" alt=""></td>
									<td class="default">
										<a href="user?id=someuser" class="hnuser">someuser</a>
									</td>
								</tr>
							</table>
						</td>
					</tr>
				</table>
			`;

			initCommentUX(document, comments, 'someuser');

			const authorLink = document.querySelector<HTMLAnchorElement>('a.hnuser');
			expect(authorLink?.classList.contains('oj_op')).toBe(false);
			expect(authorLink?.innerText).not.toContain('[op]');
		});
	});
});
