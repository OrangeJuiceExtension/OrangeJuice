import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContentScriptContext } from '#imports';
import { hideReadStoriesOnce } from '@/components/story/hide-read-stories.ts';
import { keyboardNavigation } from '@/components/story/keyboard-navigation.ts';
import { StoryData } from '@/components/story/story-data.ts';
import lStorage from '@/utils/local-storage.ts';
import { paths } from '@/utils/paths.ts';
import { getEnableFocusBoxPreference } from '@/utils/preferences.ts';

vi.mock('@/utils/preferences.ts', () => ({
	getEnableFocusBoxPreference: vi.fn(async () => true),
}));

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
		const subline = doc.createElement('span');
		subline.classList.add('subline');
		const score = doc.createElement('span');
		score.classList.add('score');
		score.textContent = `${i} points`;
		const age = doc.createElement('span');
		age.classList.add('age');
		const ageLink = doc.createElement('a');
		ageLink.href = `item?id=${i}`;
		ageLink.textContent = '1 hour ago';
		age.appendChild(ageLink);
		subline.append(score, age);
		subtext.appendChild(subline);
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
	let hrefStr = href;
	Object.defineProperty(window, 'location', {
		configurable: true,
		value: {
			get href() {
				return hrefStr;
			},
			set href(val: string) {
				hrefStr = val;
			},
		},
		writable: true,
	});
};

const setActiveElement = (doc: Document, element: HTMLElement) => {
	Object.defineProperty(doc, 'activeElement', {
		configurable: true,
		get: () => element,
	});
};

const clearActiveElement = (doc: Document) => {
	Object.defineProperty(doc, 'activeElement', {
		configurable: true,
		get: () => doc.body,
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
		vi.mocked(hideReadStoriesOnce).mockResolvedValue();
	});

	describe('arrow left/right navigation', () => {
		it.each([
			{
				expectedLocation: 'https://news.ycombinator.com',
				expectedOpen: `${paths.base}/item?id=1`,
				key: 'ArrowLeft',
				name: 'ArrowLeft opens comments in new tab',
				shiftKey: false,
			},
			{
				expectedLocation: `${paths.base}/item?id=1`,
				expectedOpen: undefined,
				key: 'ArrowLeft',
				name: 'Shift+ArrowLeft opens comments in same tab',
				shiftKey: true,
			},
			{
				expectedLocation: 'https://news.ycombinator.com',
				expectedOpen: 'https://example.com/1',
				key: 'ArrowRight',
				name: 'ArrowRight opens story url in new tab',
				shiftKey: false,
			},
			{
				expectedLocation: 'https://example.com/1',
				expectedOpen: undefined,
				key: 'ArrowRight',
				name: 'Shift+ArrowRight opens story url in same tab',
				shiftKey: true,
			},
			{
				ctrlKey: true,
				expectedLocation: 'https://news.ycombinator.com',
				expectedOpen: undefined,
				key: 'ArrowRight',
				name: 'Ctrl+ArrowRight does nothing',
				shiftKey: false,
			},
		])('$name', async ({ ctrlKey = false, expectedLocation, expectedOpen, key, shiftKey }) => {
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
				configurable: true,
				value: openSpy,
				writable: true,
			});

			await keyboardNavigation(ctx, doc, storyData, { helpModalOpen: false });

			const event = new KeyboardEvent('keydown', {
				ctrlKey,
				key,
				shiftKey,
			});
			doc.dispatchEvent(event);

			if (expectedOpen) {
				expect(openSpy).toHaveBeenCalledWith(expectedOpen, '_blank', 'noopener,noreferrer');
			} else {
				expect(openSpy).not.toHaveBeenCalled();
			}
			expect(window.location.href).toBe(expectedLocation);
		});
	});

	it('should skip focus styles when the preference is disabled', async () => {
		vi.mocked(getEnableFocusBoxPreference).mockResolvedValueOnce(false);
		const storyData = createStoryData(doc);

		await keyboardNavigation(ctx, doc, storyData, { helpModalOpen: false });

		expect(doc.head.querySelector('style')).toBeNull();
	});

	describe('arrow up/down without active story', () => {
		it.each([
			{
				expectedId: '2',
				hideStoryId: '1',
				key: 'ArrowDown',
				name: 'ArrowDown selects first visible',
			},
			{
				expectedId: '2',
				hideStoryId: '3',
				key: 'ArrowUp',
				name: 'ArrowUp selects last visible',
			},
		])('$name', async ({ expectedId, hideStoryId, key }) => {
			doc = document.implementation.createHTMLDocument();
			ctx = { onInvalidated: vi.fn() } as unknown as ContentScriptContext;
			const storyData = createStoryData(doc);
			const toHide = storyData.get(hideStoryId);
			if (!toHide) {
				throw new Error('Expected story to exist');
			}
			toHide.hide();

			await keyboardNavigation(ctx, doc, storyData, { helpModalOpen: false });

			const event = new KeyboardEvent('keydown', { key });
			doc.dispatchEvent(event);

			expect(storyData.getActiveStory()?.id).toBe(expectedId);
		});
	});

	it('should persist active story when selecting by click', async () => {
		window.history.pushState({}, '', '/news');
		Object.defineProperty(window, 'location', {
			configurable: true,
			value: {
				href: 'https://news.ycombinator.com/news',
				pathname: '/news',
				search: '',
			},
			writable: true,
		});
		const storyData = createStoryData(doc);
		const first = storyData.first();
		if (!first) {
			throw new Error('Expected story to exist');
		}

		await keyboardNavigation(ctx, doc, storyData, { helpModalOpen: false });

		first.storyRow.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		await vi.waitFor(() => {
			expect(storyData.getActiveStory()?.id).toBe(first.id);
		});

		await vi.waitFor(() => {
			expect(lStorage.setItem).toHaveBeenCalledWith(
				'oj_active_story_id2',
				expect.objectContaining({
					'/news': first.id,
				})
			);
		});
	});

	it('should deselect active story when clicking outside', async () => {
		const storyData = createStoryData(doc);
		const first = storyData.first();
		if (!first) {
			throw new Error('Expected story to exist');
		}
		storyData.activate(first);

		await keyboardNavigation(ctx, doc, storyData, { helpModalOpen: false });

		const outside = doc.createElement('div');
		doc.body.appendChild(outside);

		outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));

		expect(storyData.getActiveStory()).toBeUndefined();
	});

	it('should hide read stories when pressing H without moving active story if active is not hidden', async () => {
		const storyData = createStoryData(doc);
		const first = storyData.first();
		if (!first) {
			throw new Error('Expected story to exist');
		}
		storyData.activate(first);

		await keyboardNavigation(ctx, doc, storyData, { helpModalOpen: false });

		doc.dispatchEvent(new KeyboardEvent('keydown', { key: 'H', shiftKey: true }));

		await vi.waitFor(() => {
			expect(hideReadStoriesOnce).toHaveBeenCalledWith(storyData);
		});

		await vi.waitFor(() => {
			expect(storyData.getActiveStory()?.id).toBe('1');
		});
	});

	it('should move to next story on H when active story becomes hidden', async () => {
		const storyData = createStoryData(doc);
		const first = storyData.first();
		if (!first) {
			throw new Error('Expected story to exist');
		}
		storyData.activate(first);

		vi.mocked(hideReadStoriesOnce).mockImplementation(() => {
			first.hide();
			return Promise.resolve();
		});

		await keyboardNavigation(ctx, doc, storyData, { helpModalOpen: false });

		doc.dispatchEvent(new KeyboardEvent('keydown', { key: 'H', shiftKey: true }));

		await vi.waitFor(() => {
			expect(hideReadStoriesOnce).toHaveBeenCalledWith(storyData);
		});

		await vi.waitFor(() => {
			expect(storyData.getActiveStory()?.id).toBe('2');
		});
	});

	it('should copy the active story HN url with y', async () => {
		const storyData = createStoryData(doc);
		const first = storyData.first();
		if (!first) {
			throw new Error('Expected story to exist');
		}
		storyData.activate(first);
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, 'clipboard', {
			configurable: true,
			value: { writeText },
		});

		await keyboardNavigation(ctx, doc, storyData, { helpModalOpen: false });
		doc.dispatchEvent(new KeyboardEvent('keydown', { key: 'y' }));

		await vi.waitFor(() => {
			expect(writeText).toHaveBeenCalledWith(`${paths.base}/item?id=1`);
		});
		await vi.waitFor(() => {
			expect(doc.getElementById('oj-copy-feedback')?.textContent).toBe('Copied HN link');
		});
	});

	it('should not trigger shortcuts while a text input is focused', async () => {
		const storyData = createStoryData(doc);
		const input = doc.createElement('input');
		input.type = 'text';
		doc.body.appendChild(input);
		setActiveElement(doc, input);
		const initialHref = window.location.href;

		await keyboardNavigation(ctx, doc, storyData, { helpModalOpen: false });
		doc.dispatchEvent(new KeyboardEvent('keydown', { key: 'm' }));

		expect(window.location.href).toBe(initialHref);

		doc.body.removeChild(input);
		clearActiveElement(doc);
	});

	it('should not trigger shortcuts while a textarea is focused', async () => {
		const storyData = createStoryData(doc);
		const textarea = doc.createElement('textarea');
		doc.body.appendChild(textarea);
		setActiveElement(doc, textarea);
		const initialHref = window.location.href;

		await keyboardNavigation(ctx, doc, storyData, { helpModalOpen: false });
		doc.dispatchEvent(new KeyboardEvent('keydown', { key: 'm' }));

		expect(window.location.href).toBe(initialHref);

		doc.body.removeChild(textarea);
		clearActiveElement(doc);
	});

	it('should not trigger shortcuts while a contenteditable element is focused', async () => {
		const storyData = createStoryData(doc);
		const editable = doc.createElement('div');
		editable.contentEditable = 'true';
		doc.body.appendChild(editable);
		setActiveElement(doc, editable);
		const initialHref = window.location.href;

		await keyboardNavigation(ctx, doc, storyData, { helpModalOpen: false });
		doc.dispatchEvent(new KeyboardEvent('keydown', { key: 'm' }));

		expect(window.location.href).toBe(initialHref);

		doc.body.removeChild(editable);
		clearActiveElement(doc);
	});

	it('should activate last story on pageshow when nav state is prev', async () => {
		window.history.pushState({}, '', '/news?p=1');
		const storyData = createStoryData(doc);
		let navState: 'prev' | null = null;

		vi.mocked(lStorage.getItem).mockImplementation((key) => {
			if (key === ACTIVE_STORY_KEY) {
				return Promise.resolve({});
			}
			if (key === NAV_STATE_KEY) {
				return Promise.resolve(navState);
			}
			return Promise.resolve(null);
		});

		await keyboardNavigation(ctx, doc, storyData, { helpModalOpen: false });
		expect(storyData.getActiveStory()).toBeUndefined();

		navState = 'prev';
		window.dispatchEvent(new Event('pageshow'));

		await vi.waitFor(() => {
			expect(storyData.getActiveStory()?.id).toBe('3');
		});
	});
});
