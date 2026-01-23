/** biome-ignore-all lint/suspicious/noEmptyBlockStatements: mocks */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { browser } from 'wxt/browser';
import type { HNStory } from '@/utils/types.ts';
import {
	createCheckbox,
	createReadStoriesService,
	hideStories,
	setupCheckbox,
	showStories,
} from './index.ts';

const STORY_LIST_HTML_REGEX = /class="itemlist"/;
const homepageHtml = readFileSync(
	join(__dirname, '..', '..', 'utils', '__fixtures__', 'hn-homepage.html'),
	'utf-8'
);
const storiesWithBigboxHtml = readFileSync(
	join(__dirname, '__fixtures__', 'stories-with-bigbox.html'),
	'utf-8'
);
const emptyPageHtml = readFileSync(join(__dirname, '__fixtures__', 'empty-page.html'), 'utf-8');

describe('hide_read_stories', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
		localStorage.clear();
		vi.clearAllMocks();
	});

	afterEach(() => {
		document.body.innerHTML = '';
		localStorage.clear();
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

		it('should hide story rows when ids are provided', () => {
			const storyRow = document.createElement('tr');
			storyRow.id = '12345678';
			document.body.appendChild(storyRow);

			const subtextRow = document.createElement('tr');
			storyRow.after(subtextRow);

			const spacerRow = document.createElement('tr');
			subtextRow.after(spacerRow);

			expect(storyRow.style.display).toBe('');
			expect(subtextRow.style.display).toBe('');
			expect(spacerRow.style.display).toBe('');

			hideStories(['12345678']);

			expect(storyRow.style.display).toBe('none');
			expect(subtextRow.style.display).toBe('none');
			expect(spacerRow.style.display).toBe('none');
		});

		it('should show story rows when ids are provided', () => {
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

			showStories(['87654321']);

			expect(storyRow.style.display).toBe('');
			expect(subtextRow.style.display).toBe('');
			expect(spacerRow.style.display).toBe('');
		});

		it('should handle missing story elements gracefully', () => {
			expect(() => {
				hideStories(['nonexistent']);
			}).not.toThrow();
		});

		it('should handle story without subtext or spacer rows', () => {
			const storyRow = document.createElement('tr');
			storyRow.id = 'lonely-story';
			document.body.appendChild(storyRow);

			expect(() => {
				hideStories(['lonely-story']);
			}).not.toThrow();

			expect(storyRow.style.display).toBe('none');
		});
	});

	describe('checkbox creation', () => {
		it('should create checkbox with correct attributes', () => {
			const { row, checkbox } = createCheckbox();

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
			const { row } = createCheckbox();
			const cell = row.querySelector('td');

			expect(cell).not.toBeNull();
			expect(cell?.style.paddingLeft).toBe('5px');
			expect(cell?.style.paddingBottom).toBe('10px');
		});
	});

	describe('localStorage integration', () => {
		const STORAGE_KEY = 'oj_hide_read_stories';

		it('should initialize localStorage if not set', () => {
			const container = document.createElement('div');
			const bigbox = document.createElement('div');
			bigbox.id = 'bigbox';
			container.appendChild(bigbox);

			setupCheckbox(bigbox);

			const stored = localStorage.getItem(STORAGE_KEY);
			expect(stored).toBe('{"checkbox":false}');
		});

		it('should restore checkbox state from localStorage', () => {
			localStorage.setItem(STORAGE_KEY, JSON.stringify({ checkbox: true }));

			const container = document.createElement('div');
			const bigbox = document.createElement('div');
			bigbox.id = 'bigbox';
			container.appendChild(bigbox);

			const checkbox = setupCheckbox(bigbox);

			expect(checkbox?.checked).toBe(true);
		});

		it('should handle missing checkbox property in stored state', () => {
			localStorage.setItem(STORAGE_KEY, JSON.stringify({}));

			const container = document.createElement('div');
			const bigbox = document.createElement('div');
			bigbox.id = 'bigbox';
			container.appendChild(bigbox);

			const checkbox = setupCheckbox(bigbox);

			expect(checkbox?.checked).toBe(false);
		});

		it('should return null if bigbox has no parent', () => {
			const bigbox = document.createElement('div');
			const result = setupCheckbox(bigbox);

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
			const stories: HNStory[] = [
				{
					id: '12345678',
					position: 1,
					title: 'Test Story',
					url: 'https://example.com/test',
					points: 42,
					author: 'testuser',
					postedDate: '2024-01-19T12:00:00',
					commentsCount: 15,
				},
				{
					id: '87654321',
					position: 2,
					title: 'Another Story',
					url: 'https://example.com/another',
					points: 123,
					author: 'anotheruser',
					postedDate: '2024-01-19T10:00:00',
					commentsCount: 42,
				},
			];

			mockGetVisits.mockResolvedValueOnce([{ visitTime: 1_234_567_890, transition: 'link' }]);
			mockGetVisits.mockResolvedValueOnce([]);

			const service = createReadStoriesService();
			await service.getVisits(stories);

			expect(mockGetVisits).toHaveBeenCalledTimes(2);
			expect(mockGetVisits).toHaveBeenCalledWith({
				url: 'https://example.com/test',
			});
			expect(mockGetVisits).toHaveBeenCalledWith({
				url: 'https://example.com/another',
			});
		});

		it('should return stories with visit information', async () => {
			const stories: HNStory[] = [
				{
					id: '12345678',
					position: 1,
					title: 'Visited Story',
					url: 'https://example.com/visited',
					points: 42,
					author: 'testuser',
					postedDate: '2024-01-19T12:00:00',
					commentsCount: 15,
				},
			];

			const visitData = { visitTime: 1_234_567_890, transition: 'link' };
			mockGetVisits.mockResolvedValueOnce([visitData]);

			const service = createReadStoriesService();
			const result = await service.getVisits(stories);

			expect(result).toEqual([
				{
					...stories[0],
					latestVisit: visitData,
				},
			]);
		});

		it('should return story without visit if no history exists', async () => {
			const stories: HNStory[] = [
				{
					id: '87654321',
					position: 1,
					title: 'Unvisited Story',
					url: 'https://example.com/unvisited',
					points: 123,
					author: 'anotheruser',
					postedDate: '2024-01-19T10:00:00',
					commentsCount: 42,
				},
			];

			mockGetVisits.mockResolvedValueOnce([]);

			const service = createReadStoriesService();
			const result = await service.getVisits(stories);

			expect(result).toEqual([stories[0]]);
		});

		it('should handle errors when fetching visit history', async () => {
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			const stories: HNStory[] = [
				{
					id: '12345678',
					position: 1,
					title: 'Test Story',
					url: 'https://example.com/test',
					points: 42,
					author: 'testuser',
					postedDate: '2024-01-19T12:00:00',
					commentsCount: 15,
				},
			];

			mockGetVisits.mockRejectedValueOnce(new Error('Permission denied'));

			const service = createReadStoriesService();
			const result = await service.getVisits(stories);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				'Error fetching visit history for story:',
				stories[0],
				expect.any(Error)
			);
			expect(result).toEqual([stories[0]]);

			consoleErrorSpy.mockRestore();
		});

		it('should handle errors in getVisits', async () => {
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			mockGetVisits.mockRejectedValueOnce(new Error('Unexpected error'));

			const service = createReadStoriesService();
			await service.getVisits([
				{
					id: '12345678',
					position: 1,
					title: 'Test',
					url: 'https://example.com',
					points: 42,
					author: 'test',
					postedDate: '2024-01-19T12:00:00',
					commentsCount: 15,
				},
			]);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				'Error fetching visit history for story:',
				expect.objectContaining({ id: '12345678' }),
				expect.any(Error)
			);

			consoleErrorSpy.mockRestore();
		});

		it('should handle multiple stories with mixed visit history', async () => {
			const stories: HNStory[] = [
				{
					id: '1',
					position: 1,
					title: 'Story 1',
					url: 'https://example.com/1',
					points: 10,
					author: 'user1',
					postedDate: '2024-01-19T12:00:00',
					commentsCount: 5,
				},
				{
					id: '2',
					position: 2,
					title: 'Story 2',
					url: 'https://example.com/2',
					points: 20,
					author: 'user2',
					postedDate: '2024-01-19T11:00:00',
					commentsCount: 10,
				},
				{
					id: '3',
					position: 3,
					title: 'Story 3',
					url: 'https://example.com/3',
					points: 30,
					author: 'user3',
					postedDate: '2024-01-19T10:00:00',
					commentsCount: 15,
				},
			];

			const visit1 = { visitTime: 1000, transition: 'link' };
			const visit3 = { visitTime: 3000, transition: 'typed' };

			mockGetVisits.mockResolvedValueOnce([visit1]);
			mockGetVisits.mockResolvedValueOnce([]);
			mockGetVisits.mockResolvedValueOnce([visit3]);

			const service = createReadStoriesService();
			const result = await service.getVisits(stories);

			expect(result).toEqual([
				{ ...stories[0], latestVisit: visit1 },
				stories[1],
				{ ...stories[2], latestVisit: visit3 },
			]);
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

			const story1 = document.getElementById('story1');
			const story2 = document.getElementById('story2');

			expect(story1?.style.display).toBe('');
			expect(story2?.style.display).toBe('');

			hideStories(['story1', 'story3']);

			expect(story1?.style.display).toBe('none');
			expect(story2?.style.display).toBe('');

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
				hideStories(['nonexistent']);
			}).not.toThrow();

			document.body.removeChild(div);
		});

		it('should have valid structure for setupCheckbox', () => {
			const div = document.createElement('div');
			div.innerHTML = emptyPageHtml;
			document.body.appendChild(div);

			const bigbox = document.getElementById('bigbox');
			expect(bigbox).not.toBeNull();
			expect(bigbox?.parentElement).not.toBeNull();

			// biome-ignore lint/style/noNonNullAssertion: it is a test ffs
			const checkbox = setupCheckbox(bigbox!);
			expect(checkbox).not.toBeNull();
			expect(checkbox?.id).toBe('oj-hide-read-stories');

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

			const story1 = document.getElementById('story1');
			const story2 = document.getElementById('story2');

			expect(story1?.style.display).toBe('');
			expect(story2?.style.display).toBe('');

			hideStories(['story1', 'story3']);

			expect(story1?.style.display).toBe('none');
			expect(story2?.style.display).toBe('');

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
				hideStories(['nonexistent']);
			}).not.toThrow();

			document.body.removeChild(div);
		});

		it('should have valid structure for setupCheckbox', () => {
			const div = document.createElement('div');
			div.innerHTML = emptyPageHtml;
			document.body.appendChild(div);

			const bigbox = document.getElementById('bigbox');
			expect(bigbox).not.toBeNull();
			expect(bigbox?.parentElement).not.toBeNull();

			// biome-ignore lint/style/noNonNullAssertion: it is a test
			const checkbox = setupCheckbox(bigbox!);
			expect(checkbox).not.toBeNull();
			expect(checkbox?.id).toBe('oj-hide-read-stories');

			document.body.removeChild(div);
		});
	});
});
