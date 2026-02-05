import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KeyboardHandlers } from '@/components/story/keyboard-handlers.ts';
import { StoryData } from '@/components/story/story-data.ts';
import lStorage from '@/utils/localStorage.ts';

const ACTIVE_STORY_KEY = 'oj_active_story_id';
const NAV_STATE_KEY = 'oj_page_nav_state';

const createStoryRows = (doc: Document, count: number) => {
	const rows: HTMLElement[] = [];
	for (let i = 1; i <= count; i += 1) {
		const storyRow = doc.createElement('tr');
		storyRow.id = `${i}`;

		const rankCell = doc.createElement('td');
		const rank = doc.createElement('span');
		rank.classList.add('rank');
		rank.textContent = `${i}.`;
		rankCell.appendChild(rank);
		storyRow.appendChild(rankCell);

		const titleCell = doc.createElement('td');
		const titleline = doc.createElement('span');
		titleline.classList.add('titleline');
		const titleLink = doc.createElement('a');
		titleLink.textContent = `Story ${i}`;
		titleLink.setAttribute('href', `https://example.com/${i}`);
		titleline.appendChild(titleLink);
		titleCell.appendChild(titleline);
		storyRow.appendChild(titleCell);

		const subtextRow = doc.createElement('tr');
		const subtextCell = doc.createElement('td');
		subtextCell.setAttribute('colspan', '3');
		const score = doc.createElement('span');
		score.classList.add('score');
		score.textContent = `${i} points`;
		subtextCell.appendChild(score);
		subtextRow.appendChild(subtextCell);

		const spacerRow = doc.createElement('tr');
		const spacerCell = doc.createElement('td');
		spacerRow.appendChild(spacerCell);

		doc.body.appendChild(storyRow);
		doc.body.appendChild(subtextRow);
		doc.body.appendChild(spacerRow);
		rows.push(storyRow);
	}
	return rows;
};

describe('Story KeyboardHandlers', () => {
	let doc: Document;

	beforeEach(() => {
		doc = document.implementation.createHTMLDocument();
		vi.clearAllMocks();
		vi.spyOn(lStorage, 'getItem').mockResolvedValue(null);
		vi.spyOn(lStorage, 'setItem').mockResolvedValue();
	});

	it('should use nav state when active story id is missing', async () => {
		const cases = [
			{
				name: 'next selects first visible',
				navState: 'next',
				hideStoryId: '1',
				expectedId: '2',
			},
			{
				name: 'prev selects last visible',
				navState: 'prev',
				hideStoryId: '3',
				expectedId: '2',
			},
		];

		for (const testCase of cases) {
			doc = document.implementation.createHTMLDocument();
			const bigbox = doc.createElement('div');
			const rows = createStoryRows(doc, 3);
			const storyData = new StoryData(bigbox, rows);
			const toHide = storyData.get(testCase.hideStoryId);
			if (!toHide) {
				throw new Error('Expected story to exist');
			}
			toHide.hide();

			vi.mocked(lStorage.getItem).mockImplementation((key) => {
				if (key === ACTIVE_STORY_KEY) {
					return Promise.resolve('missing');
				}
				if (key === NAV_STATE_KEY) {
					return Promise.resolve(testCase.navState as 'next' | 'prev');
				}
				return Promise.resolve(null);
			});

			const keyboardHandlers = new KeyboardHandlers(doc);

			await keyboardHandlers.checkNavState(storyData);

			expect(storyData.getActiveStory()?.id).toBe(testCase.expectedId);
			expect(lStorage.setItem).toHaveBeenCalledWith(NAV_STATE_KEY, null);
		}
	});
});
