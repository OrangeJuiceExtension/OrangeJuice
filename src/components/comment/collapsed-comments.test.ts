import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContentScriptContext } from '#imports';
import { persistCollapsedComments } from '@/components/comment/collapsed-comments.ts';
import lStorage from '@/utils/local-storage.ts';

vi.mock('@/utils/local-storage.ts', () => ({
	default: {
		getItem: vi.fn(),
		setItem: vi.fn(),
	},
}));

describe('persistCollapsedComments', () => {
	let doc: Document;
	let ctx: ContentScriptContext;

	beforeEach(() => {
		doc = document.implementation.createHTMLDocument('test');
		ctx = { onInvalidated: vi.fn() } as unknown as ContentScriptContext;
		vi.clearAllMocks();
		window.history.replaceState({}, '', '/item?id=123');
	});

	it('restores stored collapsed comments on load', async () => {
		const firstComment = createComment(doc, 'comment-1');
		const secondComment = createComment(doc, 'comment-2');
		const firstToggle = getRequiredToggle(firstComment);
		const secondToggle = getRequiredToggle(secondComment);
		const firstClick = vi.spyOn(firstToggle, 'click');
		const secondClick = vi.spyOn(secondToggle, 'click');

		vi.mocked(lStorage.getItem).mockResolvedValue({
			123: ['comment-1', 'comment-2'],
		});
		vi.mocked(lStorage.setItem).mockResolvedValue();

		await persistCollapsedComments(ctx, [firstComment, secondComment]);

		expect(firstClick).toHaveBeenCalledTimes(1);
		expect(secondClick).toHaveBeenCalledTimes(1);
	});

	it('saves collapsed comment ids after a toggle click', async () => {
		const firstComment = createComment(doc, 'comment-1');
		const secondComment = createComment(doc, 'comment-2');
		const firstToggle = getRequiredToggle(firstComment);

		vi.mocked(lStorage.getItem).mockResolvedValue({
			123: [],
		});
		vi.mocked(lStorage.setItem).mockResolvedValue();

		await persistCollapsedComments(ctx, [firstComment, secondComment]);

		firstComment.classList.add('coll');
		firstToggle.click();
		await waitForTimers();

		expect(lStorage.setItem).toHaveBeenCalledWith('oj_collapsed_comment_ids', {
			123: ['comment-1'],
		});
	});

	it('removes ids that are no longer collapsed', async () => {
		const firstComment = createComment(doc, 'comment-1', { collapsed: true });
		const secondComment = createComment(doc, 'comment-2');
		const firstToggle = getRequiredToggle(firstComment);

		vi.mocked(lStorage.getItem).mockResolvedValue({
			123: ['comment-1'],
		});
		vi.mocked(lStorage.setItem).mockResolvedValue();

		await persistCollapsedComments(ctx, [firstComment, secondComment]);

		firstComment.classList.remove('coll');
		firstToggle.click();
		await waitForTimers();

		expect(lStorage.setItem).toHaveBeenLastCalledWith('oj_collapsed_comment_ids', {
			123: [],
		});
	});

	it('returns early when the page does not include an item id', async () => {
		const firstComment = createComment(doc, 'comment-1');

		window.history.replaceState({}, '', '/item');

		await persistCollapsedComments(ctx, [firstComment]);

		expect(lStorage.getItem).not.toHaveBeenCalled();
		expect(lStorage.setItem).not.toHaveBeenCalled();
	});
});

const waitForTimers = async (): Promise<void> => {
	await new Promise<void>((resolve) => {
		window.setTimeout(resolve, 0);
	});
};

const createComment = (
	doc: Document,
	id: string,
	options?: { collapsed?: boolean }
): HTMLElement => {
	const row = doc.createElement('tr');
	row.id = id;
	row.className = 'athing comtr';
	if (options?.collapsed) {
		row.classList.add('coll');
	}

	const toggle = doc.createElement('a');
	toggle.className = 'togg';
	toggle.textContent = '[-]';
	row.appendChild(toggle);

	doc.body.appendChild(row);
	return row;
};

const getRequiredToggle = (comment: HTMLElement): HTMLAnchorElement => {
	const toggle = comment.querySelector<HTMLAnchorElement>('a.togg');
	if (!toggle) {
		throw new Error('Expected toggle to exist');
	}
	return toggle;
};
