import type { ContentScriptContext } from '#imports';
import { dom } from '@/utils/dom.ts';
import lStorage from '@/utils/local-storage.ts';

const COLLAPSED_COMMENTS_KEY = 'oj_collapsed_comment_ids';

type CollapsedCommentsMap = Record<string, string[]>;

const getStoredCollapsedComments = async (): Promise<CollapsedCommentsMap> => {
	return (
		(await lStorage.getItem<CollapsedCommentsMap>(COLLAPSED_COMMENTS_KEY, {
			fallback: {},
		})) ?? {}
	);
};

const storeCollapsedComments = async (itemId: string, comments: HTMLElement[]): Promise<void> => {
	const stored = await getStoredCollapsedComments();
	const collapsedIds = comments
		.filter((comment) => comment.classList.contains('coll'))
		.map((comment) => comment.id);
	await lStorage.setItem(COLLAPSED_COMMENTS_KEY, {
		...stored,
		[itemId]: collapsedIds,
	});
};

export const persistCollapsedComments = async (
	ctx: ContentScriptContext,
	comments: HTMLElement[]
): Promise<void> => {
	const itemId = dom.getItemIdFromLocation();
	if (!itemId) {
		return;
	}

	const stored = await getStoredCollapsedComments();
	const storedCollapsedIds = new Set(stored[itemId] ?? []);

	for (const comment of [...comments].reverse()) {
		if (!storedCollapsedIds.has(comment.id) || comment.classList.contains('coll')) {
			continue;
		}

		const toggleButton = comment.querySelector<HTMLAnchorElement>('a.togg');
		toggleButton?.click();
	}

	const cleanupFns: Array<() => void> = [];
	let saveTimeout: number | undefined;
	const saveCollapsedComments = async (): Promise<void> => {
		await storeCollapsedComments(itemId, comments);
	};

	const scheduleSave = () => {
		if (saveTimeout !== undefined) {
			window.clearTimeout(saveTimeout);
		}

		saveTimeout = window.setTimeout(() => {
			saveTimeout = undefined;
			saveCollapsedComments();
		}, 0);
	};

	for (const comment of comments) {
		const toggleButton = comment.querySelector<HTMLAnchorElement>('a.togg');
		if (!toggleButton) {
			continue;
		}

		toggleButton.addEventListener('click', scheduleSave);
		cleanupFns.push(() => {
			toggleButton.removeEventListener('click', scheduleSave);
		});
	}

	ctx.onInvalidated(() => {
		if (saveTimeout !== undefined) {
			window.clearTimeout(saveTimeout);
		}

		for (const cleanup of cleanupFns) {
			cleanup();
		}
	});
};
