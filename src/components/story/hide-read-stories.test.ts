/** biome-ignore-all lint/suspicious/noEmptyBlockStatements: mocks */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { browser } from 'wxt/browser';
import { ReadStoriesService } from '@/services/read-stories-service.ts';
import lStorage from '@/utils/localStorage.ts';
import type { HNStory } from '@/utils/types.ts';
import {
	createCheckbox,
	hideStories,
	type StorageState,
	setupCheckbox,
	showStories, hideReadStories,
} from './hide-read-stories.ts';

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

			hideStories(['12345678'], document);

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

			showStories(['87654321'], document);

			expect(storyRow.style.display).toBe('');
			expect(subtextRow.style.display).toBe('');
			expect(spacerRow.style.display).toBe('');
		});

		it('should handle missing story elements gracefully', () => {
			expect(() => {
				hideStories(['nonexistent'], document);
			}).not.toThrow();
		});

		it('should handle story without subtext or spacer rows', () => {
			const storyRow = document.createElement('tr');
			storyRow.id = 'lonely-story';
			document.body.appendChild(storyRow);

			expect(() => {
				hideStories(['lonely-story'], document);
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

			const result = await service.getVisits(stories);

			expect(result).toEqual([stories[0]]);
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

			const result = await service.getVisits(stories);

			expect(result).toEqual([
				{ ...stories[0], latestVisit: visit1 },
				stories[1],
				{ ...stories[2], latestVisit: visit3 },
			]);
		});
	});

	describe('path filtering', () => {
		it('should skip pages with kind=comment in search params', async () => {
			Object.defineProperty(window, 'location', {
				value: {
					pathname: '/flagged',
					search: '?id=testuser&kind=comment',
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

			const mockCtx = {
				onInvalidated: vi.fn(),
			};

			await hideReadStories(mockCtx as any, document);

			// hideReadStories should exit early and not create checkbox
			const checkbox = document.getElementById('oj-hide-read-stories');
			expect(checkbox).toBeNull();

			document.body.removeChild(div);
		});

		it('should skip pages not in allowed paths', async () => {
			Object.defineProperty(window, 'location', {
				value: {
					pathname: '/item',
					search: '?id=12345',
				},
				writable: true,
				configurable: true,
			});

			const div = document.createElement('div');
			div.innerHTML = storiesWithBigboxHtml;
			document.body.appendChild(div);

			const mockCtx = {
				onInvalidated: vi.fn(),
			};

			await hideReadStories(mockCtx as any, document);

			// hideReadStories should exit early due to pathname not in allowedPaths
			const checkbox = document.getElementById('oj-hide-read-stories');
			expect(checkbox).toBeNull();

			document.body.removeChild(div);
		});

		it('should work on allowed paths without kind=comment', async () => {
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

			const story1 = document.getElementById('story1');
			const story2 = document.getElementById('story2');

			expect(story1?.style.display).toBe('');
			expect(story2?.style.display).toBe('');

			hideStories(['story1', 'story3'], document);

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
				hideStories(['nonexistent'], document);
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
