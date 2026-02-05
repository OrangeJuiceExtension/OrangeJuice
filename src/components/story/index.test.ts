import { describe, expect, it, vi } from 'vitest';
import type { ContentScriptContext } from '#imports';
import { story } from '@/components/story/index.ts';

const buildStoryRow = (doc: Document, id: string, rank: number) => {
	const storyRow = doc.createElement('tr');
	storyRow.classList.add('athing');
	storyRow.id = id;

	const rankCell = doc.createElement('td');
	const rankSpan = doc.createElement('span');
	rankSpan.classList.add('rank');
	rankSpan.textContent = `${rank}.`;
	rankCell.appendChild(rankSpan);
	storyRow.appendChild(rankCell);

	const titleCell = doc.createElement('td');
	const titleLine = doc.createElement('span');
	titleLine.classList.add('titleline');
	const titleLink = doc.createElement('a');
	titleLink.href = 'https://example.com';
	titleLink.textContent = `Story ${rank}`;
	titleLine.appendChild(titleLink);
	titleCell.appendChild(titleLine);
	storyRow.appendChild(titleCell);

	const subtextRow = doc.createElement('tr');
	const subtextCell = doc.createElement('td');
	subtextCell.setAttribute('colspan', '3');
	const subtext = doc.createElement('span');
	subtext.classList.add('subtext');
	const score = doc.createElement('span');
	score.classList.add('score');
	score.textContent = '1 point';
	const author = doc.createElement('a');
	author.classList.add('hnuser');
	author.textContent = 'user';
	const age = doc.createElement('span');
	age.classList.add('age');
	age.setAttribute('title', '2024-01-01');
	const comments = doc.createElement('a');
	comments.href = `item?id=${id}`;
	comments.textContent = '1 comment';
	subtext.append(score, author, age, comments);
	subtextCell.appendChild(subtext);
	subtextRow.appendChild(subtextCell);

	const spacerRow = doc.createElement('tr');
	spacerRow.classList.add('spacer');

	return { storyRow, subtextRow, spacerRow };
};

const setupStoryDom = (doc: Document) => {
	const bigbox = doc.createElement('div');
	bigbox.id = 'bigbox';
	const table = doc.createElement('table');
	const tbody = doc.createElement('tbody');
	const { storyRow, subtextRow, spacerRow } = buildStoryRow(doc, '1', 1);
	tbody.append(storyRow, subtextRow, spacerRow);
	table.appendChild(tbody);
	bigbox.appendChild(table);
	doc.body.appendChild(bigbox);
	return bigbox;
};

vi.mock('@/components/story/hide-read-stories.ts', () => ({
	hideReadStories: vi.fn(),
}));

vi.mock('@/components/story/keyboard-navigation.ts', () => ({
	keyboardNavigation: vi.fn(),
}));

vi.mock('@/components/common/index.ts', () => ({
	getNavState: vi.fn(() => undefined),
}));

describe('story index', () => {
	it('should wait for hide read stories before keyboard navigation', async () => {
		const cases = [{ name: 'next page selection waits for hide', path: '/news' }];

		for (const testCase of cases) {
			document.body.replaceChildren();
			setupStoryDom(document);
			window.history.replaceState({}, '', testCase.path);

			const { hideReadStories } = await import('@/components/story/hide-read-stories.ts');
			const { keyboardNavigation } = await import(
				'@/components/story/keyboard-navigation.ts'
			);

			const events: string[] = [];
			let resolveHide: (() => void) | undefined;
			vi.mocked(hideReadStories).mockImplementation(() => {
				events.push('hide-start');
				return new Promise<void>((resolve) => {
					resolveHide = () => {
						events.push('hide-done');
						resolve();
					};
				});
			});
			// biome-ignore lint/suspicious/useAwait: tests
			vi.mocked(keyboardNavigation).mockImplementation(async () => {
				events.push('keyboard');
			});

			const ctx = { onInvalidated: vi.fn() } as unknown as ContentScriptContext;

			const runPromise = story.main(ctx);

			expect(events).toEqual(['hide-start']);

			if (!resolveHide) {
				throw new Error('Expected hideReadStories to be called');
			}
			resolveHide();

			await runPromise;

			expect(events).toEqual(['hide-start', 'hide-done', 'keyboard']);
		}
	});
});
