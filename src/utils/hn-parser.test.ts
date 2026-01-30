import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseComments, parseHNStoriesPage, parsePoints, parsePosition, parseTitle, } from './hn-parser.ts';

const homepageHtml = readFileSync(join(__dirname, '__fixtures__', 'hn-homepage.html'), 'utf-8');

describe('hn-parser', () => {
	describe('parsePosition', () => {
		it('should parse position from rank element', () => {
			const row = document.createElement('tr') as HTMLTableRowElement;
			row.innerHTML = '<td><span class="rank">1.</span></td>';

			const position = parsePosition(row);

			expect(position).toBe(1);
		});

		it('should handle double digit positions', () => {
			const row = document.createElement('tr') as HTMLTableRowElement;
			row.innerHTML = '<td><span class="rank">42.</span></td>';

			const position = parsePosition(row);

			expect(position).toBe(42);
		});

		it('should return 0 when rank element is missing', () => {
			const row = document.createElement('tr') as HTMLTableRowElement;
			row.innerHTML = '<td></td>';

			const position = parsePosition(row);

			expect(position).toBe(0);
		});
	});

	describe('parseTitle', () => {
		it('should parse title and external URL', () => {
			const row = document.createElement('tr') as HTMLTableRowElement;
			row.innerHTML =
				'<td class="title"><span class="titleline"><a href="https://example.com">Test Article</a></span></td>';

			const result = parseTitle(row);

			expect(result).toEqual({
				title: 'Test Article',
				url: 'https://example.com',
			});
		});

		it('should parse title and prepend base URL for item links', () => {
			const row = document.createElement('tr') as HTMLTableRowElement;
			row.innerHTML =
				'<td class="title"><span class="titleline"><a href="item?id=123">Ask HN: Question?</a></span></td>';

			const result = parseTitle(row);

			expect(result).toEqual({
				title: 'Ask HN: Question?',
				url: 'https://news.ycombinator.com/item?id=123',
			});
		});

		it('should return empty strings when link is missing', () => {
			const row = document.createElement('tr') as HTMLTableRowElement;
			row.innerHTML = '<td></td>';

			const result = parseTitle(row);

			expect(result).toEqual({
				title: '',
				url: '',
			});
		});
	});

	describe('parsePoints', () => {
		it('should parse points from score element', () => {
			const subtext = document.createElement('td') as HTMLTableCellElement;
			subtext.innerHTML = '<span class="score">42 points</span>';

			const points = parsePoints(subtext);

			expect(points).toBe(42);
		});

		it('should handle single point', () => {
			const subtext = document.createElement('td') as HTMLTableCellElement;
			subtext.innerHTML = '<span class="score">1 point</span>';

			const points = parsePoints(subtext);

			expect(points).toBe(1);
		});

		it('should handle large point values', () => {
			const subtext = document.createElement('td') as HTMLTableCellElement;
			subtext.innerHTML = '<span class="score">1234 points</span>';

			const points = parsePoints(subtext);

			expect(points).toBe(1234);
		});

		it('should return null when score element is missing', () => {
			const subtext = document.createElement('td') as HTMLTableCellElement;
			subtext.innerHTML = '<span>no score here</span>';

			const points = parsePoints(subtext);

			expect(points).toBeNull();
		});
	});

	describe('parseComments', () => {
		it('should parse comment count from link', () => {
			const subtext = document.createElement('td') as HTMLTableCellElement;
			subtext.innerHTML = '<a href="item?id=123">42 comments</a>';

			const count = parseComments(subtext);

			expect(count).toBe(42);
		});

		it('should handle single comment', () => {
			const subtext = document.createElement('td') as HTMLTableCellElement;
			subtext.innerHTML = '<a href="item?id=123">1 comment</a>';

			const count = parseComments(subtext);

			expect(count).toBe(1);
		});

		it('should return 0 for "discuss" text', () => {
			const subtext = document.createElement('td') as HTMLTableCellElement;
			subtext.innerHTML = '<a href="item?id=123">discuss</a>';

			const count = parseComments(subtext);

			expect(count).toBe(0);
		});

		it('should return null when item link is missing', () => {
			const subtext = document.createElement('td') as HTMLTableCellElement;
			subtext.innerHTML = '<a href="hide?id=123">hide</a>';

			const count = parseComments(subtext);

			expect(count).toBeNull();
		});

		it('should find item link among multiple links', () => {
			const subtext = document.createElement('td') as HTMLTableCellElement;
			subtext.innerHTML =
				'<a href="hide?id=123">hide</a> | <a href="item?id=123">15 comments</a>';

			const count = parseComments(subtext);

			expect(count).toBe(15);
		});
	});

	describe('parseHNHomepage', () => {
		it('should parse all stories from the homepage', () => {
			const div = document.createElement('div');
			div.innerHTML = homepageHtml;

			const stories = parseHNStoriesPage(div);

			expect(stories).toHaveLength(4);
		});

		it('should parse story with all details', () => {
			const div = document.createElement('div');
			div.innerHTML = homepageHtml;

			const stories = parseHNStoriesPage(div);
			const firstStory = stories[0];

			expect(firstStory).toEqual({
				position: 1,
				id: '12345678',
				title: 'Test Article Title',
				url: 'https://example.com/test-article',
				points: 42,
				author: 'testuser',
				postedDate: '2024-01-19T12:00:00',
				commentsCount: 15,
			});
		});

		it('should parse story with "discuss" as 0 comments', () => {
			const div = document.createElement('div');
			div.innerHTML = homepageHtml;

			const stories = parseHNStoriesPage(div);
			const askHNStory = stories[2];

			expect(askHNStory.id).toBe('99887766');
			expect(askHNStory.commentsCount).toBe(0);
		});

		it('should handle stories without votes or author (job posts)', () => {
			const div = document.createElement('div');
			div.innerHTML = homepageHtml;

			const stories = parseHNStoriesPage(div);
			const jobStory = stories[3];

			expect(jobStory.id).toBe('11223344');
			expect(jobStory.points).toBeNull();
			expect(jobStory.author).toBeNull();
			expect(jobStory.commentsCount).toBeNull();
		});

		it('should return empty array for element with no stories', () => {
			const div = document.createElement('div');
			div.innerHTML = '<table></table>';

			const stories = parseHNStoriesPage(div);

			expect(stories).toEqual([]);
		});

		it('should skip rows without id attribute', () => {
			const div = document.createElement('div');
			div.innerHTML = `
			<table class="itemlist">
				<tr class="athing">
					<td class="title">Missing ID attribute</td>
				</tr>
			</table>
		`;

			const stories = parseHNStoriesPage(div);

			expect(stories).toEqual([]);
		});

		it('should skip rows with anchor elements that have no href', () => {
			const div = document.createElement('div');
			div.innerHTML = `
			<table class="itemlist">
				<tr class="athing" id="12345">
					<td align="right" valign="top" class="title"><span class="rank">1.</span></td>
					<td class="title"><span class="titleline"><a>Story Without Href</a></span></td>
				</tr>
				<tr>
					<td colspan="2"></td>
					<td class="subtext">
						<span class="score">10 points</span> by <a href="user?id=testuser" class="hnuser">testuser</a>
						<span class="age" title="2024-01-19T12:00:00"><a href="item?id=12345">1 hour ago</a></span>
						| <a href="item?id=12345">5 comments</a>
					</td>
				</tr>
			</table>
		`;

			const stories = parseHNStoriesPage(div);

			expect(stories).toEqual([]);
		});
	});
});
