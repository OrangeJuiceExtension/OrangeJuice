import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StoryData } from '@/components/story/story-data.ts';

const createStoryRows = (doc: Document, count: number) => {
	const rows: HTMLElement[] = [];
	for (let i = 1; i <= count; i += 1) {
		const storyRow = doc.createElement('tr');
		storyRow.id = `${i}`;
		const rank = doc.createElement('span');
		rank.classList.add('rank');
		rank.textContent = `${i}.`;
		storyRow.appendChild(rank);

		const titleline = doc.createElement('span');
		titleline.classList.add('titleline');
		const titleLink = doc.createElement('a');
		titleLink.textContent = `Story ${i}`;
		titleLink.setAttribute('href', `https://example.com/${i}`);
		titleline.appendChild(titleLink);
		storyRow.appendChild(titleline);

		const subtextRow = doc.createElement('tr');
		const subtextCell = doc.createElement('td');
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

describe('StoryData', () => {
	let doc: Document;

	beforeEach(() => {
		doc = document.implementation.createHTMLDocument();
		vi.clearAllMocks();
	});

	it('should expose stories and lookup by id', () => {
		const bigbox = doc.createElement('div');
		const rows = createStoryRows(doc, 2);
		const data = new StoryData(bigbox, rows);

		expect(data.hnStories).toHaveLength(2);
		expect(data.get('2')?.id).toBe('2');
	});

	it('should skip rows without id', () => {
		const bigbox = doc.createElement('div');
		const rowWithId = createStoryRows(doc, 1)[0];
		const rowWithoutId = doc.createElement('tr');
		const data = new StoryData(bigbox, [rowWithId, rowWithoutId]);

		expect(data.hnStories).toHaveLength(1);
	});

	it('should activate and deactivate stories', () => {
		const bigbox = doc.createElement('div');
		const rows = createStoryRows(doc, 2);
		const data = new StoryData(bigbox, rows);
		const first = data.first();
		if (!first) {
			throw new Error('Expected story to exist');
		}

		data.activate(first);
		expect(data.getActiveStory()).toBe(first);

		data.deactivate();
		expect(data.getActiveStory()).toBeUndefined();
	});

	it('should get next/previous stories respecting hidden state', () => {
		const bigbox = doc.createElement('div');
		const rows = createStoryRows(doc, 3);
		const data = new StoryData(bigbox, rows);
		const first = data.first();
		const second = data.get('2');
		const third = data.get('3');
		if (!(first && second && third)) {
			throw new Error('Expected stories to exist');
		}
		second.hide();

		expect(data.getNext(first)?.id).toBe('3');
		expect(data.getNext(first, false)?.id).toBe('2');
		expect(data.getPrevious(third)?.id).toBe('1');
	});

	it('should return first visible story from top/bottom', () => {
		const bigbox = doc.createElement('div');
		const rows = createStoryRows(doc, 3);
		const data = new StoryData(bigbox, rows);
		const first = data.first();
		const last = data.last();
		if (!(first && last)) {
			throw new Error('Expected stories to exist');
		}
		first.hide();
		last.hide();

		expect(data.firstTopDownVisible()?.id).toBe('2');
		expect(data.firstBottomUpVisible()?.id).toBe('2');
	});

	it('should proxy actions to active story', () => {
		const bigbox = doc.createElement('div');
		const rows = createStoryRows(doc, 1);
		const data = new StoryData(bigbox, rows);
		const first = data.first();
		if (!first) {
			throw new Error('Expected story to exist');
		}
		data.activate(first);
		const voteSpy = vi.spyOn(first, 'toggleVote');
		const favSpy = vi.spyOn(first, 'favorite');
		const flagSpy = vi.spyOn(first, 'flag');

		data.toggleVote();
		data.favorite();
		data.flag();

		expect(voteSpy).toHaveBeenCalled();
		expect(favSpy).toHaveBeenCalled();
		expect(flagSpy).toHaveBeenCalled();
	});

	it('should resolve story from nested element', () => {
		const bigbox = doc.createElement('div');
		const rows = createStoryRows(doc, 1);
		const data = new StoryData(bigbox, rows);
		const row = rows[0];
		if (!row) {
			throw new Error('Expected story row to exist');
		}
		const inner = doc.createElement('span');
		row.appendChild(inner);

		expect(data.getStoryFromElement(inner)?.id).toBe('1');
	});

	it('should navigate to reply for active story', () => {
		const bigbox = doc.createElement('div');
		const rows = createStoryRows(doc, 1);
		const data = new StoryData(bigbox, rows);
		const first = data.first();
		if (!first) {
			throw new Error('Expected story to exist');
		}
		data.activate(first);
		const locationSpy = vi.spyOn(window.location, 'href', 'set');

		const result = data.reply();

		expect(result).toBe(true);
		expect(locationSpy).toHaveBeenCalled();
	});

	it('should return story by position', () => {
		const bigbox = doc.createElement('div');
		const rows = createStoryRows(doc, 3);
		const data = new StoryData(bigbox, rows);

		expect(data.getByPosition(2)?.id).toBe('2');
	});

	it('should add/remove listeners across stories', () => {
		const bigbox = doc.createElement('div');
		const rows = createStoryRows(doc, 2);
		const data = new StoryData(bigbox, rows);
		const handler = vi.fn();
		const story = data.hnStories[0];
		if (!story) {
			throw new Error('Expected story to exist');
		}
		const addSpy = vi.spyOn(story, 'addEventListener');
		const removeSpy = vi.spyOn(story, 'removeEventListener');

		data.addEventListener('click', handler);
		data.removeEventListener('click', handler);

		expect(addSpy).toHaveBeenCalledWith('click', handler);
		expect(removeSpy).toHaveBeenCalledWith('click', handler);
	});
});
