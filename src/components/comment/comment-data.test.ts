import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CommentData } from '@/components/comment/comment-data.ts';
import { HNComment } from '@/components/comment/hn-comment.ts';

const createCommentRow = (doc: Document, id: number, options?: { collapsed?: boolean }) => {
	const row = doc.createElement('tr');
	row.id = `comment-${id}`;
	row.classList.add('comtr');
	row.classList.add('athing');
	if (options?.collapsed) {
		row.classList.add('coll');
	}
	doc.body.appendChild(row);
	return row;
};

const createComments = (doc: Document, count: number, options?: { collapsedIds?: number[] }) => {
	const collapsedIds = new Set(options?.collapsedIds ?? []);
	const comments: HNComment[] = [];
	for (let i = 1; i <= count; i += 1) {
		const row = createCommentRow(doc, i, { collapsed: collapsedIds.has(i) });
		comments.push(new HNComment(row));
	}
	return comments;
};

describe('CommentData', () => {
	let doc: Document;

	beforeEach(() => {
		doc = document.implementation.createHTMLDocument();
		vi.clearAllMocks();
	});

	it('should get comments by id', () => {
		const comments = createComments(doc, 2);
		const data = new CommentData(comments);

		expect(data.get('comment-2')?.id).toBe('comment-2');
	});

	it('should resolve comment from nested element', () => {
		const comments = createComments(doc, 1);
		const data = new CommentData(comments);
		const row = doc.getElementById('comment-1');
		if (!row) {
			throw new Error('Expected comment row to exist');
		}
		const inner = doc.createElement('span');
		row.appendChild(inner);

		expect(data.getCommentFromElement(inner)?.id).toBe('comment-1');
	});

	it('should activate and deactivate comments', () => {
		const comments = createComments(doc, 2);
		const data = new CommentData(comments);

		data.activate(comments[0]);
		expect(data.getActiveComment()?.id).toBe('comment-1');

		data.deactivate();
		expect(data.getActiveComment()).toBeUndefined();
	});

	it('should skip hidden comments when getting next', () => {
		const comments = createComments(doc, 3, { collapsedIds: [2] });
		const data = new CommentData(comments);

		const next = data.getNext(comments[0]);

		expect(next?.id).toBe('comment-3');
	});

	it('should include hidden comments when skipHidden is false', () => {
		const comments = createComments(doc, 3, { collapsedIds: [2] });
		const data = new CommentData(comments);

		const next = data.getNext(comments[0], false);

		expect(next?.id).toBe('comment-2');
	});

	it('should return previous comment respecting hidden rules', () => {
		const comments = createComments(doc, 3, { collapsedIds: [2] });
		const data = new CommentData(comments);

		const prev = data.getPrevious(comments[2]);

		expect(prev?.id).toBe('comment-1');
	});

	it('should find closest collapsed comments from active', () => {
		const comments = createComments(doc, 4, { collapsedIds: [2, 4] });
		const data = new CommentData(comments);
		data.activate(comments[2]);

		expect(data.closestCollapsedUp()?.id).toBe('comment-2');
		expect(data.closestCollapsedDown()?.id).toBe('comment-4');
	});

	it('should return undefined for closest collapsed when no active comment', () => {
		const comments = createComments(doc, 2, { collapsedIds: [1] });
		const data = new CommentData(comments);

		expect(data.closestCollapsedUp()).toBeUndefined();
	});

	it('should proxy actions to active comment', () => {
		const comments = createComments(doc, 1);
		const data = new CommentData(comments);
		data.activate(comments[0]);
		const favoriteSpy = vi.spyOn(comments[0], 'favorite');
		const flagSpy = vi.spyOn(comments[0], 'flag');
		const voteSpy = vi.spyOn(comments[0], 'toggleVote');
		const replySpy = vi.spyOn(comments[0], 'reply');
		const collapseSpy = vi.spyOn(comments[0], 'collapseToggle');

		data.favorite();
		data.flag();
		data.toggleVote('upvote');
		data.reply();
		data.collapseToggle();

		expect(favoriteSpy).toHaveBeenCalled();
		expect(flagSpy).toHaveBeenCalled();
		expect(voteSpy).toHaveBeenCalledWith('upvote');
		expect(replySpy).toHaveBeenCalled();
		expect(collapseSpy).toHaveBeenCalled();
	});

	it('should add/remove listeners across comments', () => {
		const comments = createComments(doc, 2);
		const data = new CommentData(comments);
		const handler = vi.fn();
		const addSpy = vi.spyOn(comments[0], 'addEventListener');
		const addSpy2 = vi.spyOn(comments[1], 'addEventListener');
		const removeSpy = vi.spyOn(comments[0], 'removeEventListener');
		const removeSpy2 = vi.spyOn(comments[1], 'removeEventListener');

		data.addEventListener('click', handler);
		data.removeEventListener('click', handler);

		expect(addSpy).toHaveBeenCalledWith('click', handler);
		expect(addSpy2).toHaveBeenCalledWith('click', handler);
		expect(removeSpy).toHaveBeenCalledWith('click', handler);
		expect(removeSpy2).toHaveBeenCalledWith('click', handler);
	});
});
