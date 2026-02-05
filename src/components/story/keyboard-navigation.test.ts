import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContentScriptContext } from '#imports';
import { keyboardNavigation } from '@/components/story/keyboard-navigation.ts';
import { StoryData } from '@/components/story/story-data.ts';
import lStorage from '@/utils/localStorage.ts';
import { paths } from '@/utils/paths.ts';

const createStoryRows = (doc: Document, count: number) => {
	const rows: HTMLElement[] = [];
	for (let i = 1; i <= count; i += 1) {
		const storyRow = doc.createElement('tr');
		storyRow.classList.add('athing');
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
		const subtext = doc.createElement('span');
		subtext.classList.add('subtext');
		const score = doc.createElement('span');
		score.classList.add('score');
		score.textContent = `${i} points`;
		subtext.appendChild(score);
		subtextCell.appendChild(subtext);
		subtextRow.appendChild(subtextCell);

		const spacerRow = doc.createElement('tr');
		spacerRow.classList.add('spacer');

		doc.body.appendChild(storyRow);
		doc.body.appendChild(subtextRow);
		doc.body.appendChild(spacerRow);
		rows.push(storyRow);
	}
	return rows;
};

const createStoryData = (doc: Document) => {
	const bigbox = doc.createElement('div');
	const rows = createStoryRows(doc, 3);
	return new StoryData(bigbox, rows);
};

const setLocationHref = (href: string) => {
	Object.defineProperty(window, 'location', {
		value: {
			get href() {
				return href;
			},
			set href(val: string) {
				href = val;
			},
		},
		writable: true,
		configurable: true,
	});
};

describe('story keyboard navigation', () => {
	let doc: Document;
	let ctx: ContentScriptContext;

	beforeEach(() => {
		doc = document.implementation.createHTMLDocument();
		ctx = { onInvalidated: vi.fn() } as unknown as ContentScriptContext;
		vi.clearAllMocks();
		vi.spyOn(lStorage, 'getItem').mockResolvedValue(null);
		vi.spyOn(lStorage, 'setItem').mockResolvedValue();
	});

	it('should handle arrow left/right navigation', async () => {
		const cases = [
			{
				name: 'ArrowLeft opens comments in new tab',
				key: 'ArrowLeft',
				shiftKey: false,
				expectedOpen: `${paths.base}/item?id=1`,
				expectedLocation: 'https://news.ycombinator.com',
			},
			{
				name: 'Shift+ArrowLeft opens comments in same tab',
				key: 'ArrowLeft',
				shiftKey: true,
				expectedOpen: undefined,
				expectedLocation: `${paths.base}/item?id=1`,
			},
			{
				name: 'ArrowRight opens story url in new tab',
				key: 'ArrowRight',
				shiftKey: false,
				expectedOpen: 'https://example.com/1',
				expectedLocation: 'https://news.ycombinator.com',
			},
			{
				name: 'Shift+ArrowRight opens story url in same tab',
				key: 'ArrowRight',
				shiftKey: true,
				expectedOpen: undefined,
				expectedLocation: 'https://example.com/1',
			},
			{
				name: 'Ctrl+ArrowRight does nothing',
				key: 'ArrowRight',
				shiftKey: false,
				ctrlKey: true,
				expectedOpen: undefined,
				expectedLocation: 'https://news.ycombinator.com',
			},
		];

		for (const testCase of cases) {
			doc = document.implementation.createHTMLDocument();
			ctx = { onInvalidated: vi.fn() } as unknown as ContentScriptContext;
			const storyData = createStoryData(doc);
			const first = storyData.first();
			if (!first) {
				throw new Error('Expected story to exist');
			}
			storyData.activate(first);

			setLocationHref('https://news.ycombinator.com');
			const openSpy = vi.fn();
			Object.defineProperty(window, 'open', {
				value: openSpy,
				writable: true,
				configurable: true,
			});

			await keyboardNavigation(ctx, doc, storyData, { helpModalOpen: false });

			const event = new KeyboardEvent('keydown', {
				key: testCase.key,
				shiftKey: testCase.shiftKey,
				ctrlKey: testCase.ctrlKey ?? false,
			});
			doc.dispatchEvent(event);

			if (testCase.expectedOpen) {
				expect(openSpy).toHaveBeenCalledWith(testCase.expectedOpen, '_blank');
			} else {
				expect(openSpy).not.toHaveBeenCalled();
			}
			expect(window.location.href).toBe(testCase.expectedLocation);
		}
	});

	it('should move with arrow up/down when no active story', async () => {
		const cases = [
			{
				name: 'ArrowDown selects first visible',
				key: 'ArrowDown',
				hideStoryId: '1',
				expectedId: '2',
			},
			{
				name: 'ArrowUp selects last visible',
				key: 'ArrowUp',
				hideStoryId: '3',
				expectedId: '2',
			},
		];

		for (const testCase of cases) {
			doc = document.implementation.createHTMLDocument();
			ctx = { onInvalidated: vi.fn() } as unknown as ContentScriptContext;
			const storyData = createStoryData(doc);
			const toHide = storyData.get(testCase.hideStoryId);
			if (!toHide) {
				throw new Error('Expected story to exist');
			}
			toHide.hide();

			await keyboardNavigation(ctx, doc, storyData, { helpModalOpen: false });

			const event = new KeyboardEvent('keydown', { key: testCase.key });
			doc.dispatchEvent(event);

			expect(storyData.getActiveStory()?.id).toBe(testCase.expectedId);
		}
	});
});
