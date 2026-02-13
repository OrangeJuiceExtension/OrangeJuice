import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hideReadStoriesOnce } from '@/components/story/hide-read-stories.ts';
import { KeyboardHandlers } from '@/components/story/keyboard-handlers.ts';
import { StoryData } from '@/components/story/story-data.ts';
import lStorage from '@/utils/local-storage.ts';

const ACTIVE_STORY_KEY = 'oj_active_story_id2';
const NAV_STATE_KEY = 'oj_page_nav_state';

vi.mock('@/components/story/hide-read-stories.ts', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/components/story/hide-read-stories.ts')>();
	return {
		...actual,
		hideReadStoriesOnce: vi.fn(),
	};
});

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
		window.history.pushState({}, '', '/news?p=1');
		vi.clearAllMocks();
		vi.spyOn(lStorage, 'getItem').mockResolvedValue(null);
		vi.spyOn(lStorage, 'setItem').mockResolvedValue();
		vi.mocked(hideReadStoriesOnce).mockResolvedValue();
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
					return Promise.resolve({ '/news?p=1': 'missing' });
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

	it('should skip dead or hidden HN rows when activating from next-page nav state', async () => {
		const bigbox = doc.createElement('div');
		const rows = createStoryRows(doc, 3);
		const storyData = new StoryData(bigbox, rows);
		const firstRow = rows[0];
		if (!firstRow) {
			throw new Error('Expected story row to exist');
		}
		firstRow.classList.add('noshow');

		vi.mocked(lStorage.getItem).mockImplementation((key) => {
			if (key === ACTIVE_STORY_KEY) {
				return Promise.resolve({ '/news?p=2': 'missing' });
			}
			if (key === NAV_STATE_KEY) {
				return Promise.resolve('next');
			}
			return Promise.resolve(null);
		});

		const keyboardHandlers = new KeyboardHandlers(doc);
		await keyboardHandlers.checkNavState(storyData);

		expect(storyData.getActiveStory()?.id).toBe('2');
		expect(lStorage.setItem).toHaveBeenCalledWith(NAV_STATE_KEY, null);
	});

	it('should clear stored active story when missing on page', async () => {
		const bigbox = doc.createElement('div');
		const rows = createStoryRows(doc, 2);
		const storyData = new StoryData(bigbox, rows);

		vi.mocked(lStorage.getItem).mockImplementation((key) => {
			if (key === ACTIVE_STORY_KEY) {
				return Promise.resolve({ '/news?p=1': 'missing' });
			}
			if (key === NAV_STATE_KEY) {
				return Promise.resolve(null);
			}
			return Promise.resolve(null);
		});

		const keyboardHandlers = new KeyboardHandlers(doc);

		await keyboardHandlers.checkNavState(storyData);

		expect(lStorage.setItem).toHaveBeenCalledWith(ACTIVE_STORY_KEY, {});
		expect(storyData.getActiveStory()).toBeUndefined();
	});

	it('should clear stored active story on escape', async () => {
		const bigbox = doc.createElement('div');
		const rows = createStoryRows(doc, 2);
		const storyData = new StoryData(bigbox, rows);
		const firstStory = storyData.get('1');
		if (!firstStory) {
			throw new Error('Expected story to exist');
		}
		storyData.activate(firstStory);

		vi.mocked(lStorage.getItem).mockImplementation((key) => {
			if (key === ACTIVE_STORY_KEY) {
				return Promise.resolve({ '/news?p=1': '1' });
			}
			return Promise.resolve(null);
		});

		const keyboardHandlers = new KeyboardHandlers(doc);

		await keyboardHandlers.escape(storyData);

		expect(lStorage.setItem).toHaveBeenCalledWith(ACTIVE_STORY_KEY, {});
		expect(storyData.getActiveStory()).toBeUndefined();
	});

	it('should keep active story when active story is not hidden after hiding read stories', async () => {
		const bigbox = doc.createElement('div');
		const rows = createStoryRows(doc, 3);
		const storyData = new StoryData(bigbox, rows);
		const firstStory = storyData.get('1');
		if (!firstStory) {
			throw new Error('Expected story to exist');
		}
		storyData.activate(firstStory);

		const keyboardHandlers = new KeyboardHandlers(doc);

		await keyboardHandlers.hideReadStoriesNow(storyData);

		expect(storyData.getActiveStory()?.id).toBe('1');
		expect(hideReadStoriesOnce).toHaveBeenCalledWith(storyData);
	});

	it('should activate next visible story when active story is hidden after hiding read stories', async () => {
		const bigbox = doc.createElement('div');
		const rows = createStoryRows(doc, 3);
		const storyData = new StoryData(bigbox, rows);
		const firstStory = storyData.get('1');
		const secondStory = storyData.get('2');
		if (!firstStory) {
			throw new Error('Expected story to exist');
		}
		if (!secondStory) {
			throw new Error('Expected story to exist');
		}
		storyData.activate(firstStory);
		secondStory.hide();

		vi.mocked(hideReadStoriesOnce).mockImplementation(() => {
			firstStory.hide();
			return Promise.resolve();
		});

		const keyboardHandlers = new KeyboardHandlers(doc);

		await keyboardHandlers.hideReadStoriesNow(storyData);

		expect(storyData.getActiveStory()?.id).toBe('3');
		expect(hideReadStoriesOnce).toHaveBeenCalledWith(storyData);
	});

	it('should escape when active hidden story has no next visible story', async () => {
		const bigbox = doc.createElement('div');
		const rows = createStoryRows(doc, 2);
		const storyData = new StoryData(bigbox, rows);
		const lastStory = storyData.get('2');
		if (!lastStory) {
			throw new Error('Expected story to exist');
		}
		storyData.activate(lastStory);
		vi.mocked(hideReadStoriesOnce).mockImplementation(() => {
			lastStory.hide();
			return Promise.resolve();
		});

		vi.mocked(lStorage.getItem).mockResolvedValueOnce({ '/news?p=1': '2' });

		const keyboardHandlers = new KeyboardHandlers(doc);

		await keyboardHandlers.hideReadStoriesNow(storyData);

		expect(storyData.getActiveStory()).toBeUndefined();
		expect(hideReadStoriesOnce).toHaveBeenCalledWith(storyData);
	});

	describe('goBack', () => {
		it('should navigate to first page when current page is 2', () => {
			let href = 'https://news.ycombinator.com/news?p=2';
			Object.defineProperty(window, 'location', {
				value: {
					get href() {
						return href;
					},
					set href(value: string) {
						href = value;
					},
					search: '?p=2',
				},
				writable: true,
				configurable: true,
			});

			const keyboardHandlers = new KeyboardHandlers(doc);
			keyboardHandlers.goBack();

			expect(window.location.href).toBe('/news');
		});

		it('should decrement page when current page is greater than 2', () => {
			let href = 'https://news.ycombinator.com/news?p=5';
			Object.defineProperty(window, 'location', {
				value: {
					get href() {
						return href;
					},
					set href(value: string) {
						href = value;
					},
					search: '?p=5',
				},
				writable: true,
				configurable: true,
			});

			const keyboardHandlers = new KeyboardHandlers(doc);
			keyboardHandlers.goBack();

			expect(window.location.href).toBe('/news?p=4');
		});
	});
});
