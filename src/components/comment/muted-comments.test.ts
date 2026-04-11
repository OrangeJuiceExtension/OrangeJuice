import { describe, expect, it } from 'vitest';
import { HNComment } from '@/components/comment/hn-comment.ts';
import { applyMutedComments, OJ_MUTED_COMMENT } from './muted-comments.ts';

const createComment = (doc: Document, username: string, body: string): HTMLElement => {
	const comment = doc.createElement('div');
	comment.innerHTML = `
		<span class="comhead">
			<a class="hnuser" href="user?id=${username}">${username}</a>
		</span>
		<div class="comment">
			<span class="commtext">${body}</span>
		</div>
	`;
	return comment;
};

const createHNComment = (doc: Document, username: string, body: string): HNComment => {
	const comment = createComment(doc, username, body);
	comment.id = username;
	return new HNComment(comment);
};

describe('muted-comments', () => {
	it('adds muted comment styles to the document head', () => {
		const doc = document.implementation.createHTMLDocument();

		applyMutedComments(doc, [], []);

		const styleElement = doc.head.querySelector('style');
		expect(styleElement).not.toBeNull();
		expect(styleElement?.textContent).toContain(`.${OJ_MUTED_COMMENT}`);
		expect(styleElement?.textContent).toContain('--oj-muted-comment-color');
		expect(styleElement?.textContent).toContain('#8b8276');
		expect(styleElement?.textContent).toContain('#9a9082');
	});

	it('adds the muted class to comments whose authors are muted', () => {
		const doc = document.implementation.createHTMLDocument();
		const mutedComment = createHNComment(doc, 'pg', 'Muted body');
		const liveComment = createHNComment(doc, 'dang', 'Live body');

		applyMutedComments(doc, [mutedComment, liveComment], ['pg']);

		expect(mutedComment.commentRow.classList.contains(OJ_MUTED_COMMENT)).toBe(true);
		expect(
			mutedComment.commentRow.querySelector('.commtext')?.classList.contains(OJ_MUTED_COMMENT)
		).toBe(true);
		expect(
			mutedComment.commentRow.querySelector('.comhead')?.classList.contains(OJ_MUTED_COMMENT)
		).toBe(true);
		expect(mutedComment.commentRow.querySelector('.oj_muted_marker')?.textContent).toContain(
			'[muted]'
		);
		expect(liveComment.commentRow.classList.contains(OJ_MUTED_COMMENT)).toBe(false);
		expect(
			liveComment.commentRow.querySelector('.commtext')?.classList.contains(OJ_MUTED_COMMENT)
		).toBe(false);
		expect(liveComment.commentRow.querySelector('.oj_muted_marker')).toBeNull();
	});

	it('removes the muted class when a user is no longer muted', () => {
		const doc = document.implementation.createHTMLDocument();
		const comment = createHNComment(doc, 'pg', 'Body');

		applyMutedComments(doc, [comment], ['pg']);
		applyMutedComments(doc, [comment], []);

		expect(comment.commentRow.classList.contains(OJ_MUTED_COMMENT)).toBe(false);
		expect(
			comment.commentRow.querySelector('.commtext')?.classList.contains(OJ_MUTED_COMMENT)
		).toBe(false);
		expect(comment.commentRow.querySelector('.oj_muted_marker')).toBeNull();
	});

	it('ignores comments without text bodies', () => {
		const doc = document.implementation.createHTMLDocument();
		const comment = doc.createElement('div');
		comment.className = 'comtr';
		comment.innerHTML = `
			<span class="comhead">
				<a class="hnuser" href="user?id=pg">pg</a>
			</span>
		`;
		comment.id = 'missing-body';

		expect(() => applyMutedComments(doc, [new HNComment(comment)], ['pg'])).not.toThrow();
	});
});
