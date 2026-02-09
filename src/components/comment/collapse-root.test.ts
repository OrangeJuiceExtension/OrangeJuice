import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContentScriptContext } from '#imports';
import { CommentData } from '@/components/comment/comment-data.ts';
import { addIndentation, createCommentRow } from '@/components/comment/constants.ts';
import { HNComment } from '@/components/comment/hn-comment.ts';
import { dom } from '@/utils/dom';
import { collapseRoot } from './collapse-root';

const createComment = (
	doc: Document,
	id: number,
	indentLevel: number,
	options: { withComhead?: boolean; withToggle?: boolean } = {}
) => {
	const row = createCommentRow(doc, id);
	addIndentation(doc, row, indentLevel);

	const defaultCell = doc.createElement('td');
	defaultCell.className = 'default';
	row.appendChild(defaultCell);

	if (options.withComhead) {
		const comhead = doc.createElement('span');
		comhead.className = 'comhead';
		defaultCell.appendChild(comhead);
	}

	if (options.withToggle) {
		const toggle = doc.createElement('a');
		toggle.className = 'togg';
		defaultCell.appendChild(toggle);
	}

	return row;
};

const createCommentData = (rows: HTMLElement[]) => {
	const comments: HNComment[] = [];
	for (const row of rows) {
		comments.push(new HNComment(row));
	}
	return new CommentData(comments);
};

describe('collapseRoot', () => {
	let mockCtx: ContentScriptContext;
	let cleanupFunctions: Array<() => void>;

	beforeEach(() => {
		document.body.innerHTML = '';
		cleanupFunctions = [];

		mockCtx = {
			onInvalidated: vi.fn((callback: () => void) => {
				cleanupFunctions.push(callback);
			}),
		} as unknown as ContentScriptContext;

		vi.spyOn(dom, 'elementPosition').mockReturnValue({ x: 0, y: 100 });
		vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
	});

	it('should skip root comments without adding collapse links', () => {
		const rootComment = createComment(document, 1, 0, { withComhead: true });
		const childComment = createComment(document, 2, 1, { withComhead: true });
		const commentData = createCommentData([rootComment, childComment]);
		document.body.append(rootComment, childComment);

		collapseRoot(mockCtx, document, [rootComment, childComment], commentData);

		const rootComhead = rootComment.querySelector('span.comhead');
		expect(rootComhead?.textContent).not.toContain('[collapse root]');

		const childComhead = childComment.querySelector('span.comhead');
		expect(childComhead?.textContent).toContain('[collapse root]');
	});

	it('should add collapse root links to child comments', () => {
		const rootComment = createComment(document, 1, 0, {
			withComhead: true,
			withToggle: true,
		});
		const childComment = createComment(document, 2, 1, { withComhead: true });
		const commentData = createCommentData([rootComment, childComment]);
		document.body.append(rootComment, childComment);

		collapseRoot(mockCtx, document, [rootComment, childComment], commentData);

		const comhead = childComment.querySelector('span.comhead');
		const collapseLink = comhead?.querySelector('a');

		expect(collapseLink).toBeTruthy();
		expect(collapseLink?.textContent).toBe('[collapse root]');
	});

	it('should click root toggle and scroll to root when collapse link is clicked', async () => {
		const rootComment = createComment(document, 1, 0, {
			withComhead: true,
			withToggle: true,
		});
		const toggleLink = rootComment.querySelector<HTMLAnchorElement>('a.togg');
		if (!toggleLink) {
			throw new Error('Expected toggle link to exist');
		}
		const toggleSpy = vi.spyOn(toggleLink, 'click');
		const childComment = createComment(document, 2, 1, { withComhead: true });
		const commentData = createCommentData([rootComment, childComment]);
		document.body.append(rootComment, childComment);

		collapseRoot(mockCtx, document, [rootComment, childComment], commentData);
		const collapseLink = childComment.querySelector<HTMLAnchorElement>('span.comhead a');
		collapseLink?.click();

		await vi.waitFor(() => {
			expect(window.scrollTo).toHaveBeenCalledWith(0, 100);
		});

		expect(toggleSpy).toHaveBeenCalled();
	});

	it('should handle multiple child comments with same root', () => {
		const rootComment = createComment(document, 1, 0, {
			withComhead: true,
			withToggle: true,
		});
		const child1 = createComment(document, 2, 1, { withComhead: true });
		const child2 = createComment(document, 3, 2, { withComhead: true });
		const commentData = createCommentData([rootComment, child1, child2]);
		document.body.append(rootComment, child1, child2);

		collapseRoot(mockCtx, document, [rootComment, child1, child2], commentData);

		const link1 = child1.querySelector('span.comhead a');
		const link2 = child2.querySelector('span.comhead a');

		expect(link1?.textContent).toBe('[collapse root]');
		expect(link2?.textContent).toBe('[collapse root]');
	});

	it('should register cleanup handlers for all added links', () => {
		const rootComment = createComment(document, 1, 0, {
			withComhead: true,
			withToggle: true,
		});
		const child1 = createComment(document, 2, 1, { withComhead: true });
		const child2 = createComment(document, 3, 2, { withComhead: true });
		const commentData = createCommentData([rootComment, child1, child2]);
		document.body.append(rootComment, child1, child2);

		collapseRoot(mockCtx, document, [rootComment, child1, child2], commentData);

		expect(mockCtx.onInvalidated).toHaveBeenCalledTimes(2);
		expect(cleanupFunctions).toHaveLength(2);
	});

	it('should not add collapse link when comhead is missing', () => {
		const rootComment = createComment(document, 1, 0, { withToggle: true });
		const childComment = createComment(document, 2, 1);
		const commentData = createCommentData([rootComment, childComment]);
		document.body.append(rootComment, childComment);

		collapseRoot(mockCtx, document, [rootComment, childComment], commentData);

		const collapseLink = childComment.querySelector('a');
		expect(collapseLink).toBeNull();
	});

	it('should handle multiple root comments correctly', () => {
		const root1 = createComment(document, 1, 0, {
			withComhead: true,
			withToggle: true,
		});
		const child1 = createComment(document, 2, 1, { withComhead: true });
		const root2 = createComment(document, 3, 0, {
			withComhead: true,
			withToggle: true,
		});
		const child2 = createComment(document, 4, 1, { withComhead: true });
		const commentData = createCommentData([root1, child1, root2, child2]);
		document.body.append(root1, child1, root2, child2);

		collapseRoot(mockCtx, document, [root1, child1, root2, child2], commentData);

		const link1 = child1.querySelector<HTMLAnchorElement>('span.comhead a');
		const link2 = child2.querySelector<HTMLAnchorElement>('span.comhead a');

		const toggle1 = root1.querySelector<HTMLAnchorElement>('a.togg');
		const toggle2 = root2.querySelector<HTMLAnchorElement>('a.togg');
		if (!(toggle1 && toggle2)) {
			throw new Error('Expected toggle links to exist');
		}
		const toggle1Spy = vi.spyOn(toggle1, 'click');
		const toggle2Spy = vi.spyOn(toggle2, 'click');

		link1?.click();
		expect(toggle1Spy).toHaveBeenCalled();
		expect(toggle2Spy).not.toHaveBeenCalled();

		link2?.click();
		expect(toggle2Spy).toHaveBeenCalled();
	});

	it('should remove event listeners when context is invalidated', () => {
		const rootComment = createComment(document, 1, 0, {
			withComhead: true,
			withToggle: true,
		});
		const toggleLink = rootComment.querySelector<HTMLAnchorElement>('a.togg');
		if (!toggleLink) {
			throw new Error('Expected toggle link to exist');
		}
		const toggleSpy = vi.spyOn(toggleLink, 'click');
		const childComment = createComment(document, 2, 1, { withComhead: true });
		const commentData = createCommentData([rootComment, childComment]);
		document.body.append(rootComment, childComment);

		collapseRoot(mockCtx, document, [rootComment, childComment], commentData);

		const collapseLink = childComment.querySelector<HTMLAnchorElement>('span.comhead a');

		// Call all cleanup functions
		for (const cleanup of cleanupFunctions) {
			cleanup();
		}

		// After cleanup, clicking should not trigger the toggle
		collapseLink?.click();
		expect(toggleSpy).not.toHaveBeenCalled();
	});
});
