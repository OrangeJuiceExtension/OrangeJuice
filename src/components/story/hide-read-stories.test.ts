import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { browser } from '#imports';
import { ReadStoriesService } from '@/services/read-stories-service.ts';
import lStorage from '@/utils/local-storage.ts';
import {
	createCheckbox,
	hideStories,
	type StorageState,
	setupCheckbox,
	showStories,
} from './hide-read-stories.ts';
import { HNStory } from './hn-story.ts';

const STORY_LIST_HTML_REGEX = /class="itemlist"/;
const homepageHtml = readFileSync(
	join(import.meta.dirname, '..', '..', 'utils', '__fixtures__', 'hn-homepage.html'),
	'utf-8'
);
const storiesWithBigboxHtml = readFileSync(
	join(import.meta.dirname, '__fixtures__', 'stories-with-bigbox.html'),
	'utf-8'
);
const emptyPageHtml = readFileSync(
	join(import.meta.dirname, '__fixtures__', 'empty-page.html'),
	'utf-8'
);

describe('hide_read_stories', () => {
	let service: ReadStoriesService;
	beforeEach(() => {
		document.body.innerHTML = '';
		lStorage.clear();
		vi.clearAllMocks();
		service = new ReadStoriesService();
	});

	afterEach(() => {
		document.body.innerHTML = '';
		lStorage.clear();
	});

	describe('DOM manipulation', () => {
		it('should parse homepage HTML and find elements', () => {
			const div = document.createElement('div');
			div.innerHTML = homepageHtml;
			document.body.appendChild(div);

			const hnmain = div.querySelector('#hnmain');
			expect(hnmain).not.toBeNull();

			const itemlist = div.querySelector('.itemlist');
			expect(itemlist).not.toBeNull();
		});

		it('should hide story rows when stories are provided', () => {
			const storyRow = document.createElement('tr');
			storyRow.id = '12345678';
			document.body.appendChild(storyRow);

			const subtextRow = document.createElement('tr');
			storyRow.after(subtextRow);

			const spacerRow = document.createElement('tr');
			subtextRow.after(spacerRow);

			const story = new HNStory(storyRow);

			expect(storyRow.style.display).toBe('');
			expect(subtextRow.style.display).toBe('');
			expect(spacerRow.style.display).toBe('');

			hideStories([story]);

			expect(storyRow.style.display).toBe('none');
			expect(subtextRow.style.display).toBe('none');
			expect(spacerRow.style.display).toBe('none');
		});

		it('should show story rows when stories are provided', () => {
			const storyRow = document.createElement('tr');
			storyRow.id = '87654321';
			storyRow.style.display = 'none';
			document.body.appendChild(storyRow);

			const subtextRow = document.createElement('tr');
			subtextRow.style.display = 'none';
			storyRow.after(subtextRow);

			const spacerRow = document.createElement('tr');
			spacerRow.style.display = 'none';
			subtextRow.after(spacerRow);

			const story = new HNStory(storyRow);

			showStories([story]);

			expect(storyRow.style.display).toBe('');
			expect(subtextRow.style.display).toBe('');
			expect(spacerRow.style.display).toBe('');
		});

		it('should handle empty story list gracefully', () => {
			expect(() => {
				hideStories([]);
			}).not.toThrow();
		});

		it('should handle story without subtext or spacer rows', () => {
			const storyRow = document.createElement('tr');
			storyRow.id = 'lonely-story';
			document.body.appendChild(storyRow);

			const story = new HNStory(storyRow);

			expect(() => {
				hideStories([story]);
			}).not.toThrow();

			expect(storyRow.style.display).toBe('none');
		});
	});

	describe('checkbox creation', () => {
		it('should create checkbox with correct attributes', () => {
			const { row, checkbox } = createCheckbox(document);

			expect(checkbox.type).toBe('checkbox');
			expect(checkbox.id).toBe('oj-hide-read-stories');
			expect(checkbox.style.marginRight).toBe('5px');

			const label = row.querySelector('label');
			expect(label).not.toBeNull();
			expect(label?.style.cursor).toBe('pointer');
			expect(label?.style.userSelect).toBe('none');
			expect(label?.textContent).toBe('Hide read stories');
		});

		it('should have correct cell styling', () => {
			const { row } = createCheckbox(document);
			const cell = row.querySelector('td');

			expect(cell).not.toBeNull();
			expect(cell?.style.paddingLeft).toBe('5px');
			expect(cell?.style.paddingBottom).toBe('10px');
		});
	});

	describe('localStorage integration', () => {
		const STORAGE_KEY = 'oj_hide_read_stories';

		it('should initialize localStorage if not set', async () => {
			const container = document.createElement('div');
			const bigbox = document.createElement('div');
			bigbox.id = 'bigbox';
			container.appendChild(bigbox);

			await setupCheckbox(bigbox, document);

			const stored = await lStorage.getItem<StorageState>(STORAGE_KEY);
			expect(stored).toEqual({ checkbox: false });
		});

		it('should restore checkbox state from localStorage', async () => {
			await lStorage.setItem(STORAGE_KEY, { checkbox: true });

			const container = document.createElement('div');
			const bigbox = document.createElement('div');
			bigbox.id = 'bigbox';
			container.appendChild(bigbox);

			const checkbox = await setupCheckbox(bigbox, document);

			expect(checkbox?.checked).toBe(true);
		});

		it('should handle missing checkbox property in stored state', async () => {
			await lStorage.setItem(STORAGE_KEY, {});

			const container = document.createElement('div');
			const bigbox = document.createElement('div');
			bigbox.id = 'bigbox';
			container.appendChild(bigbox);

			const checkbox = await setupCheckbox(bigbox, document);

			expect(checkbox?.checked).toBe(false);
		});

		it('should return null if bigbox has no parent', async () => {
			const bigbox = document.createElement('div');
			const result = await setupCheckbox(bigbox, document);

			expect(result).toBeNull();
		});
	});

	describe('createReadStoriesService', () => {
		const mockGetVisits = vi.fn();

		beforeEach(() => {
			browser.history.getVisits = mockGetVisits;
			mockGetVisits.mockClear();
		});

		it('should fetch visit history for each story', async () => {
			const storyRow1 = document.createElement('tr');
			storyRow1.id = '12345678';
			document.body.appendChild(storyRow1);

			const storyRow2 = document.createElement('tr');
			storyRow2.id = '87654321';
			document.body.appendChild(storyRow2);

			const story1 = new HNStory(storyRow1);
			story1.title = 'Test Story';
			story1.url = 'https://example.com/test';
			story1.points = 42;
			story1.author = 'testuser';
			story1.postedDate = '2024-01-19T12:00:00';
			story1.commentsCount = 15;

			const story2 = new HNStory(storyRow2);
			story2.title = 'Another Story';
			story2.url = 'https://example.com/another';
			story2.points = 123;
			story2.author = 'anotheruser';
			story2.postedDate = '2024-01-19T10:00:00';
			story2.commentsCount = 42;

			const stories = [story1, story2];

			mockGetVisits.mockResolvedValueOnce([{ visitTime: 1_234_567_890, transition: 'link' }]);
			mockGetVisits.mockResolvedValueOnce([]);

			await service.getVisits(stories);

			expect(mockGetVisits).toHaveBeenCalledTimes(2);
			expect(mockGetVisits).toHaveBeenCalledWith({
				url: 'https://example.com/test',
			});
			expect(mockGetVisits).toHaveBeenCalledWith({
				url: 'https://example.com/another',
			});

			document.body.removeChild(storyRow1);
			document.body.removeChild(storyRow2);
		});

		it('should return stories with visit information', async () => {
			const storyRow = document.createElement('tr');
			storyRow.id = '12345678';
			document.body.appendChild(storyRow);

			const story = new HNStory(storyRow);
			story.title = 'Visited Story';
			story.url = 'https://example.com/visited';
			story.points = 42;
			story.author = 'testuser';
			story.postedDate = '2024-01-19T12:00:00';
			story.commentsCount = 15;

			const stories = [story];

			const visitData = { visitTime: 1_234_567_890, transition: 'link' };
			mockGetVisits.mockResolvedValueOnce([visitData]);

			const result = await service.getVisits(stories);

			expect(result).toHaveLength(1);
			if (!result) {
				throw new Error('expected result to be defined');
			}
			expect(result[0].id).toBe('12345678');
			expect(result[0].latestVisit).toEqual(visitData);

			document.body.removeChild(storyRow);
		});

		it('should return story without visit if no history exists', async () => {
			const storyRow = document.createElement('tr');
			storyRow.id = '87654321';
			document.body.appendChild(storyRow);

			const story = new HNStory(storyRow);
			story.title = 'Unvisited Story';
			story.url = 'https://example.com/unvisited';
			story.points = 123;
			story.author = 'anotheruser';
			story.postedDate = '2024-01-19T10:00:00';
			story.commentsCount = 42;

			const stories = [story];

			mockGetVisits.mockResolvedValueOnce([]);

			const result = await service.getVisits(stories);

			expect(result).toHaveLength(1);
			if (!result) {
				throw new Error('expected result to be defined');
			}
			expect(result[0].id).toBe('87654321');
			expect(result[0].latestVisit).toBeUndefined();

			document.body.removeChild(storyRow);
		});

		it('should handle multiple stories with mixed visit history', async () => {
			const storyRow1 = document.createElement('tr');
			storyRow1.id = '1';
			document.body.appendChild(storyRow1);

			const storyRow2 = document.createElement('tr');
			storyRow2.id = '2';
			document.body.appendChild(storyRow2);

			const storyRow3 = document.createElement('tr');
			storyRow3.id = '3';
			document.body.appendChild(storyRow3);

			const story1 = new HNStory(storyRow1);
			story1.url = 'https://example.com/1';

			const story2 = new HNStory(storyRow2);
			story2.url = 'https://example.com/2';

			const story3 = new HNStory(storyRow3);
			story3.url = 'https://example.com/3';

			const stories = [story1, story2, story3];

			const visit1 = { visitTime: 1000, transition: 'link' };
			const visit3 = { visitTime: 3000, transition: 'typed' };

			mockGetVisits.mockResolvedValueOnce([visit1]);
			mockGetVisits.mockResolvedValueOnce([]);
			mockGetVisits.mockResolvedValueOnce([visit3]);

			const result = await service.getVisits(stories);

			expect(result).toHaveLength(3);
			if (!result) {
				throw new Error('expected result to be defined');
			}
			expect(result[0].id).toBe('1');
			expect(result[0].latestVisit).toEqual(visit1);
			expect(result[1].id).toBe('2');
			expect(result[1].latestVisit).toBeUndefined();
			expect(result[2].id).toBe('3');
			expect(result[2].latestVisit).toEqual(visit3);

			document.body.removeChild(storyRow1);
			document.body.removeChild(storyRow2);
			document.body.removeChild(storyRow3);
		});
	});

	describe('checkbox setup', () => {
		it('should create checkbox on valid page', async () => {
			Object.defineProperty(window, 'location', {
				value: {
					pathname: '/flagged',
					search: '',
				},
				writable: true,
				configurable: true,
			});

			const div = document.createElement('div');
			div.innerHTML = storiesWithBigboxHtml;
			document.body.appendChild(div);

			const bigbox = document.getElementById('bigbox');
			if (!bigbox) {
				expect(bigbox).not.toBeNull();
				return;
			}

			const checkbox = await setupCheckbox(bigbox, document);
			expect(checkbox).not.toBeNull();
			expect(checkbox?.id).toBe('oj-hide-read-stories');

			document.body.removeChild(div);
		});
	});

	describe('fixture validation', () => {
		it('should have valid homepage HTML fixture', () => {
			expect(homepageHtml).toBeTruthy();
			expect(STORY_LIST_HTML_REGEX.test(homepageHtml)).toBe(true);
		});

		it('should contain story rows in fixture', () => {
			const div = document.createElement('div');
			div.innerHTML = homepageHtml;

			const storyRows = div.querySelectorAll('.athing');
			expect(storyRows.length).toBeGreaterThan(0);
		});

		it('should have stories with proper IDs in fixture', () => {
			const div = document.createElement('div');
			div.innerHTML = homepageHtml;
			document.body.appendChild(div);

			const firstStory = document.getElementById('12345678');
			expect(firstStory).not.toBeNull();

			document.body.removeChild(div);
		});
	});

	describe('stories-with-bigbox fixture', () => {
		it('should have bigbox element', () => {
			const div = document.createElement('div');
			div.innerHTML = storiesWithBigboxHtml;

			const bigbox = div.querySelector('#bigbox');
			expect(bigbox).not.toBeNull();
		});

		it('should have exactly 3 stories', () => {
			const div = document.createElement('div');
			div.innerHTML = storiesWithBigboxHtml;

			const storyRows = div.querySelectorAll('.athing');
			expect(storyRows.length).toBe(3);
		});

		it('should have stories with expected IDs', () => {
			const div = document.createElement('div');
			div.innerHTML = storiesWithBigboxHtml;
			document.body.appendChild(div);

			const story1 = document.getElementById('story1');
			const story2 = document.getElementById('story2');
			const story3 = document.getElementById('story3');

			expect(story1).not.toBeNull();
			expect(story2).not.toBeNull();
			expect(story3).not.toBeNull();

			document.body.removeChild(div);
		});

		it('should allow hiding specific stories from fixture', () => {
			const div = document.createElement('div');
			div.innerHTML = storiesWithBigboxHtml;
			document.body.appendChild(div);

			const story1El = document.getElementById('story1');
			const story2El = document.getElementById('story2');
			const story3El = document.getElementById('story3');

			expect(story1El?.style.display).toBe('');
			expect(story2El?.style.display).toBe('');

			const story1 = new HNStory(story1El as HTMLElement);
			const story3 = new HNStory(story3El as HTMLElement);

			hideStories([story1, story3]);

			expect(story1El?.style.display).toBe('none');
			expect(story2El?.style.display).toBe('');

			document.body.removeChild(div);
		});

		it('should have bigbox with parent for checkbox insertion', () => {
			const div = document.createElement('div');
			div.innerHTML = storiesWithBigboxHtml;
			document.body.appendChild(div);

			const bigbox = document.getElementById('bigbox');
			expect(bigbox).not.toBeNull();
			expect(bigbox?.parentElement).not.toBeNull();

			document.body.removeChild(div);
		});
	});

	describe('empty-page fixture', () => {
		it('should have bigbox element', () => {
			const div = document.createElement('div');
			div.innerHTML = emptyPageHtml;

			const bigbox = div.querySelector('#bigbox');
			expect(bigbox).not.toBeNull();
		});

		it('should have itemlist but no stories', () => {
			const div = document.createElement('div');
			div.innerHTML = emptyPageHtml;

			const itemlist = div.querySelector('.itemlist');
			expect(itemlist).not.toBeNull();

			const storyRows = div.querySelectorAll('.athing');
			expect(storyRows.length).toBe(0);
		});

		it('should handle empty page gracefully', () => {
			const div = document.createElement('div');
			div.innerHTML = emptyPageHtml;
			document.body.appendChild(div);

			expect(() => {
				hideStories([]);
			}).not.toThrow();

			document.body.removeChild(div);
		});

		it('should have valid structure for setupCheckbox', async () => {
			const div = document.createElement('div');
			div.innerHTML = emptyPageHtml;
			document.body.appendChild(div);

			const bigbox = document.getElementById('bigbox');
			expect(bigbox).not.toBeNull();
			expect(bigbox?.parentElement).not.toBeNull();

			// biome-ignore lint/style/noNonNullAssertion: it is a test
			const checkbox = await setupCheckbox(bigbox!, document);
			expect(checkbox).not.toBeNull();
			expect(checkbox?.id).toBe('oj-hide-read-stories');

			document.body.removeChild(div);
		});
	});
});
