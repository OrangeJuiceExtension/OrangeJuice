import { HNStory } from '@/components/story/hn-story.ts';
import { IndexedList } from '@/utils/indexed-list.ts';

export const focusClass1 = 'oj_focused_story';
export const focusClass2 = 'oj_focused_story_details';
export const focusClass3 = 'oj_focused_story_spacer';

/**
 * This allows us to navigate and track a list of stories.
 */
export class StoryData {
	private readonly storiesList: IndexedList<HNStory>;
	private activeStory?: HNStory;
	bigbox: HTMLElement;

	constructor(bigbox: HTMLElement, storyRows: HTMLElement[]) {
		this.bigbox = bigbox;
		const stories: HNStory[] = [];
		for (const storyRow of storyRows) {
			const id = storyRow.getAttribute('id');
			if (!id) {
				continue;
			}
			const story = new HNStory(storyRow);
			stories.push(story);
		}
		this.storiesList = new IndexedList(stories, (story) => story.id);
	}

	get hnStories(): HNStory[] {
		return this.storiesList.toArray();
	}

	get(id: string): HNStory | undefined {
		return this.storiesList.get(id);
	}

	getNext(current: HNStory, skipHidden = true): HNStory | undefined {
		let next = this.storiesList.getNext(current);
		while (next && skipHidden && next.hidden()) {
			next = this.storiesList.getNext(next);
		}
		return next;
	}

	getPrevious(current: HNStory, skipHidden = true): HNStory | undefined {
		let prev = this.storiesList.getPrevious(current);
		while (prev && skipHidden && prev.hidden()) {
			prev = this.storiesList.getPrevious(prev);
		}
		return prev;
	}

	// starts from the top of the list and moves downwards to find the first visible element
	firstTopDownVisible(): HNStory | undefined {
		const first = this.storiesList.first();
		if (!first) {
			return undefined;
		}
		if (!first.hidden()) {
			return first;
		}
		return this.getNext(first, true);
	}

	// starts from the bottom of the list and moves upwards to find the first visible element
	firstBottomUpVisible(): HNStory | undefined {
		const last = this.storiesList.last();
		if (!last) {
			return undefined;
		}
		if (!last.hidden()) {
			return last;
		}
		return this.getPrevious(last, true);
	}

	first(): HNStory | undefined {
		return this.storiesList.first();
	}

	last(): HNStory | undefined {
		return this.storiesList.last();
	}

	getActiveStory(): HNStory | undefined {
		return this.activeStory;
	}

	activate(story: HNStory) {
		this.deactivate();
		this.activeStory = story;
		this.activeStory.activate();
	}

	deactivate() {
		if (this.activeStory) {
			this.activeStory.deactivate();
			this.activeStory = undefined;
		}
	}

	hideStory(hnStory: HNStory) {
		hnStory.hide();
	}

	showStory(hnStory: HNStory) {
		hnStory.show();
	}

	addEventListener<K extends keyof HTMLElementEventMap>(
		type: K,
		listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => void
	): void {
		for (const story of this.storiesList) {
			story.addEventListener(type, listener);
		}
	}

	removeEventListener<K extends keyof HTMLElementEventMap>(
		type: K,
		listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => void
	): void {
		for (const story of this.storiesList) {
			story.removeEventListener(type, listener);
		}
	}

	toggleVote(): boolean {
		const activeStory = this.getActiveStory();
		if (!activeStory) {
			return false;
		}
		return activeStory.toggleVote();
	}

	favorite(): boolean {
		const activeStory = this.getActiveStory();
		if (!activeStory) {
			return false;
		}
		return activeStory.favorite();
	}

	flag(): boolean {
		const activeStory = this.getActiveStory();
		if (!activeStory) {
			return false;
		}
		return activeStory.flag();
	}

	getStoryFromElement(element: HTMLElement): HNStory | undefined {
		const id = HNStory.getStoryIdFromElement(element);
		if (!id) {
			return undefined;
		}
		return this.get(id);
	}

	reply(): boolean {
		const activeStory = this.getActiveStory();
		if (!activeStory) {
			return false;
		}
		const url = activeStory.commentsUrl;
		if (url) {
			window.location.href = `${url}#reply`;
			return true;
		}
		return false;
	}

	getByPosition(position: number): HNStory | undefined {
		for (const story of this.storiesList) {
			if (story.position === position) {
				return story;
			}
		}
		return undefined;
	}
}
