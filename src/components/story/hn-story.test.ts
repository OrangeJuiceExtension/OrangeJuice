import { beforeEach, describe, expect, it, vi } from 'vitest';
import { STORY_HIDDEN } from '@/components/story/hide-read-stories.ts';
import { HNStory } from '@/components/story/hn-story.ts';
import { focusClass1, focusClass2, focusClass3 } from '@/components/story/story-data.ts';
import { paths } from '@/utils/paths.ts';

const createStoryRows = (
	doc: Document,
	options?: {
		id?: string;
		rank?: string;
		title?: string;
		href?: string;
		points?: string;
		author?: string;
		postedDate?: string;
		commentsText?: string;
		commentsHref?: string;
	}
) => {
	const storyRow = doc.createElement('tr');
	storyRow.id = options?.id ?? '123';
	const rank = doc.createElement('span');
	rank.classList.add('rank');
	rank.textContent = options?.rank ?? '1.';
	storyRow.appendChild(rank);

	const titleline = doc.createElement('span');
	titleline.classList.add('titleline');
	const titleLink = doc.createElement('a');
	titleLink.textContent = options?.title ?? 'Example';
	titleLink.setAttribute('href', options?.href ?? 'https://example.com');
	titleline.appendChild(titleLink);
	storyRow.appendChild(titleline);

	const subtextRow = doc.createElement('tr');
	const subtextCell = doc.createElement('td');
	const score = doc.createElement('span');
	score.classList.add('score');
	score.textContent = options?.points ?? '42 points';
	subtextCell.appendChild(score);

	if (options?.author) {
		const author = doc.createElement('a');
		author.classList.add('hnuser');
		author.textContent = options.author;
		subtextCell.appendChild(author);
	}

	if (options?.postedDate) {
		const age = doc.createElement('span');
		age.classList.add('age');
		age.setAttribute('title', options.postedDate);
		subtextCell.appendChild(age);
	}

	if (options?.commentsText) {
		const commentsLink = doc.createElement('a');
		commentsLink.textContent = options.commentsText;
		commentsLink.setAttribute('href', options?.commentsHref ?? 'item?id=123');
		subtextCell.appendChild(commentsLink);
	}

	subtextRow.appendChild(subtextCell);

	const spacerRow = doc.createElement('tr');
	const spacerCell = doc.createElement('td');
	spacerRow.appendChild(spacerCell);

	doc.body.appendChild(storyRow);
	doc.body.appendChild(subtextRow);
	doc.body.appendChild(spacerRow);

	return { storyRow, subtextRow, spacerRow };
};

describe('HNStory', () => {
	let doc: Document;

	beforeEach(() => {
		doc = document.implementation.createHTMLDocument();
		vi.clearAllMocks();
	});

	describe('parse', () => {
		it('should parse basic fields', () => {
			const { storyRow } = createStoryRows(doc, {
				id: '456',
				rank: '3.',
				title: 'Hello',
				href: 'https://example.com/hello',
				points: '10 points',
				author: 'alice',
				postedDate: '2024-01-01',
				commentsText: '12 comments',
				commentsHref: 'item?id=456',
			});

			const story = new HNStory(storyRow);

			expect(story.id).toBe('456');
			expect(story.position).toBe(3);
			expect(story.title).toBe('Hello');
			expect(story.url).toBe('https://example.com/hello');
			expect(story.commentsUrl).toBe(`${paths.base}/item?id=456`);
			expect(story.points).toBe(10);
			expect(story.author).toBe('alice');
			expect(story.postedDate).toBe('2024-01-01');
			expect(story.commentsCount).toBe(12);
		});

		it('should set data-story-id on related rows', () => {
			const { storyRow, subtextRow, spacerRow } = createStoryRows(doc, { id: '777' });

			new HNStory(storyRow);

			expect(storyRow.getAttribute('data-story-id')).toBe('777');
			expect(subtextRow.getAttribute('data-story-id')).toBe('777');
			expect(spacerRow.getAttribute('data-story-id')).toBe('777');
		});

		it('should normalize relative title hrefs', () => {
			const { storyRow } = createStoryRows(doc, {
				href: 'item?id=123',
			});

			const story = new HNStory(storyRow);

			expect(story.url).toBe(`${paths.base}/item?id=123`);
		});

		it('should parse discuss as zero comments', () => {
			const { storyRow } = createStoryRows(doc, {
				commentsText: 'discuss',
				commentsHref: 'item?id=123',
			});

			const story = new HNStory(storyRow);

			expect(story.commentsCount).toBe(0);
		});

		it('should return undefined when score is missing', () => {
			const { storyRow, subtextRow } = createStoryRows(doc, {
				points: 'not a score',
			});
			subtextRow.querySelector('.score')?.remove();

			const story = new HNStory(storyRow);

			expect(story.points).toBeUndefined();
		});
	});

	describe('visibility', () => {
		it('should hide/show rows and track hidden state', () => {
			const { storyRow, subtextRow, spacerRow } = createStoryRows(doc);
			const story = new HNStory(storyRow);

			story.hide();
			expect(story.hidden()).toBe(true);
			expect(storyRow.style.display).toBe('none');
			expect(subtextRow.style.display).toBe('none');
			expect(spacerRow.style.display).toBe('none');
			expect(storyRow.classList.contains(STORY_HIDDEN)).toBe(true);

			story.show();
			expect(story.hidden()).toBe(false);
			expect(storyRow.style.display).toBe('');
			expect(subtextRow.style.display).toBe('');
			expect(spacerRow.style.display).toBe('');
			expect(storyRow.classList.contains(STORY_HIDDEN)).toBe(false);
		});
	});

	describe('activation', () => {
		it('should add/remove focus classes', () => {
			const { storyRow, subtextRow, spacerRow } = createStoryRows(doc);
			const story = new HNStory(storyRow);

			story.activate();
			expect(storyRow.classList.contains(focusClass1)).toBe(true);
			expect(subtextRow.classList.contains(focusClass2)).toBe(true);
			expect(spacerRow.classList.contains(focusClass3)).toBe(true);

			story.deactivate();
			expect(storyRow.classList.contains(focusClass1)).toBe(false);
			expect(subtextRow.classList.contains(focusClass2)).toBe(false);
			expect(spacerRow.classList.contains(focusClass3)).toBe(false);
		});
	});

	describe('events', () => {
		it('should add/remove listeners across rows', () => {
			const { storyRow, subtextRow, spacerRow } = createStoryRows(doc);
			const story = new HNStory(storyRow);
			const handler = vi.fn();
			const addSpy = vi.spyOn(storyRow, 'addEventListener');
			const subAddSpy = vi.spyOn(subtextRow, 'addEventListener');
			const spacerAddSpy = vi.spyOn(spacerRow, 'addEventListener');
			const removeSpy = vi.spyOn(storyRow, 'removeEventListener');
			const subRemoveSpy = vi.spyOn(subtextRow, 'removeEventListener');
			const spacerRemoveSpy = vi.spyOn(spacerRow, 'removeEventListener');

			story.addEventListener('click', handler);
			story.removeEventListener('click', handler);

			expect(addSpy).toHaveBeenCalledWith('click', handler);
			expect(subAddSpy).toHaveBeenCalledWith('click', handler);
			expect(spacerAddSpy).toHaveBeenCalledWith('click', handler);
			expect(removeSpy).toHaveBeenCalledWith('click', handler);
			expect(subRemoveSpy).toHaveBeenCalledWith('click', handler);
			expect(spacerRemoveSpy).toHaveBeenCalledWith('click', handler);
		});
	});

	describe('actions', () => {
		it('should click unvote when present', () => {
			const { storyRow, subtextRow } = createStoryRows(doc);
			const unvote = doc.createElement('a');
			unvote.id = 'un_123';
			subtextRow.appendChild(unvote);
			const clickSpy = vi.spyOn(unvote, 'click');
			const story = new HNStory(storyRow);

			const result = story.toggleVote();

			expect(result).toBe(true);
			expect(clickSpy).toHaveBeenCalled();
		});

		it('should click upvote when present', () => {
			const { storyRow } = createStoryRows(doc);
			const upvote = doc.createElement('div');
			upvote.classList.add('votearrow');
			upvote.title = 'upvote';
			const upvoteLink = doc.createElement('a');
			upvoteLink.appendChild(upvote);
			storyRow.appendChild(upvoteLink);
			const clickSpy = vi.spyOn(upvoteLink, 'click');
			const story = new HNStory(storyRow);

			const result = story.toggleVote();

			expect(result).toBe(true);
			expect(clickSpy).toHaveBeenCalled();
		});

		it('should click favorite when present', () => {
			const { storyRow, subtextRow } = createStoryRows(doc);
			const fave = doc.createElement('button');
			fave.classList.add('oj_favorite_link');
			subtextRow.appendChild(fave);
			const clickSpy = vi.spyOn(fave, 'click');
			const story = new HNStory(storyRow);

			const result = story.favorite();

			expect(result).toBe(true);
			expect(clickSpy).toHaveBeenCalled();
		});

		it('should click flag when present', () => {
			const { storyRow, subtextRow } = createStoryRows(doc);
			const flag = doc.createElement('a');
			flag.setAttribute('href', 'flag?id=123');
			subtextRow.appendChild(flag);
			const clickSpy = vi.spyOn(flag, 'click');
			const story = new HNStory(storyRow);

			const result = story.flag();

			expect(result).toBe(true);
			expect(clickSpy).toHaveBeenCalled();
		});
	});

	describe('getStoryIdFromElement', () => {
		it('should resolve id from nested element', () => {
			const { storyRow } = createStoryRows(doc, { id: '999' });
			new HNStory(storyRow);
			const inner = doc.createElement('span');
			storyRow.appendChild(inner);

			expect(HNStory.getStoryIdFromElement(inner)).toBe('999');
		});
	});
});
