import type { HNStory } from '@/components/story/hn-story.ts';
import type { StoryData } from '@/components/story/story-data.ts';
import { dom } from '@/utils/dom.ts';
import lStorage from '@/utils/localStorage.ts';

const PAGE_PARAM_REGEX = /[?&]p=\d+/;
const CHECKBOX_ID = 'oj-hide-read-stories';
const NAV_STATE_KEY = 'oj_page_nav_state';
const ACTIVE_STORY_KEY = 'oj_active_story_id';

type NavDirection = 'next' | 'prev';

export class KeyboardHandlers {
	private readonly doc: Document;

	constructor(doc: Document) {
		this.doc = doc;
	}

	// Move up or down
	async move(storyData: StoryData, direction: 'up' | 'down') {
		if (!storyData.getActiveStory()) {
			await this.activateFirstItem(storyData, direction);
			return;
		}

		const nextItem = this.getNextItem(storyData, direction);
		if (!nextItem) {
			if (direction === 'down') {
				await lStorage.setItem(NAV_STATE_KEY, 'next');
				this.clickMore(this.doc);
			} else if (direction === 'up') {
				await lStorage.setItem(NAV_STATE_KEY, 'prev');
				this.goBack();
			}
			return;
		}

		await this.activateStory(storyData, nextItem);
		this.handleScrolling(storyData, nextItem, direction);
	}

	async activateFirstItem(storyData: StoryData, direction: 'up' | 'down') {
		let visible: HNStory | undefined;
		if (direction === 'down') {
			visible = storyData.firstTopDownVisible();
		} else if (direction === 'up') {
			visible = storyData.firstBottomUpVisible();
		}
		if (visible) {
			await this.activateStory(storyData, visible);
		}
	}

	getNextItem(storyData: StoryData, direction: 'up' | 'down') {
		const activeStory = storyData.getActiveStory();
		if (!activeStory) {
			return undefined;
		}

		return direction === 'down'
			? storyData.getNext(activeStory)
			: storyData.getPrevious(activeStory);
	}

	handleScrolling(storyData: StoryData, nextItem: HNStory, direction: 'up' | 'down') {
		const activeStory = storyData.getActiveStory();
		if (!dom.elementInScrollView(nextItem.storyRow) && activeStory) {
			activeStory.storyRow.scrollIntoView(true);
		}

		if (direction === 'up' && nextItem === storyData.first()) {
			this.doc.body.scrollTo(0, 0);
		}
	}

	// De-activate item
	escape(storyData: StoryData) {
		(this.doc.activeElement as HTMLElement)?.blur();
		storyData.deactivate();
	}

	async activateStory(storyData: StoryData, story: HNStory) {
		storyData.activate(story);
		await lStorage.setItem(ACTIVE_STORY_KEY, story.id);
	}

	// Activate item
	activateElement(storyData: StoryData, toActivate: HTMLElement) {
		const story = storyData.getStoryFromElement(toActivate);
		if (!story) {
			return;
		}
		storyData.activate(story);
	}

	favorite(storyData: StoryData) {
		storyData.favorite();
	}

	flag(storyData: StoryData) {
		storyData.flag();
	}

	vote(storyData: StoryData) {
		storyData.toggleVote();
	}

	reply(storyData: StoryData) {
		storyData.reply();
	}

	open(storyData: StoryData) {
		const activeStory = storyData.getActiveStory();
		if (activeStory?.url) {
			window.open(activeStory.url, '_blank');
		}
	}

	openWithComments(storyData: StoryData) {
		const activeStory = storyData.getActiveStory();
		if (activeStory?.url) {
			window.open(activeStory.url, '_blank');
			window.open(activeStory.commentsUrl, '_blank');
		}
	}

	openByPosition(storyData: StoryData, key: string) {
		const position = key === '0' ? 10 : Number.parseInt(key, 10);
		const story = storyData.getByPosition(position);
		if (story?.url) {
			window.open(story.url, '_blank');
		}
	}

	clickMore(doc: Document) {
		const MORE_LINK = 'a.morelink';
		const moreLink = doc.querySelector<HTMLAnchorElement>(MORE_LINK);
		if (moreLink) {
			moreLink.click();
		}
	}

	goBack() {
		if (PAGE_PARAM_REGEX.test(window.location.search)) {
			window.history.back();
		}
	}

	toggleHideRead(doc: Document) {
		const checkbox = doc.getElementById(CHECKBOX_ID) as HTMLInputElement;
		if (checkbox) {
			checkbox.checked = !checkbox.checked;
			checkbox.dispatchEvent(new Event('change'));
		}
	}

	async checkNavState(storyData: StoryData): Promise<void> {
		const activeStoryId = await lStorage.getItem<string>(ACTIVE_STORY_KEY);
		const navState = await lStorage.getItem<NavDirection>(NAV_STATE_KEY);

		const story = activeStoryId ? storyData.get(activeStoryId) : undefined;
		const isInMiddle = story && story !== storyData.first() && story !== storyData.last();

		if (navState && !story) {
			await lStorage.setItem(NAV_STATE_KEY, null);
			const target =
				navState === 'next'
					? storyData.firstTopDownVisible()
					: storyData.firstBottomUpVisible();
			if (target) {
				await this.activateStory(storyData, target);
			}
			return;
		}

		// Prioritize an active story if in the middle of a list
		if (isInMiddle && !story.hidden()) {
			await this.activateStory(storyData, story);
			if (navState) {
				await lStorage.setItem(NAV_STATE_KEY, null);
			}
			return;
		}

		// Handle nav state
		if (navState) {
			await lStorage.setItem(NAV_STATE_KEY, null);
			const target =
				navState === 'next'
					? storyData.firstTopDownVisible()
					: storyData.firstBottomUpVisible();
			if (target) {
				await this.activateStory(storyData, target);
			}
			return;
		}

		// Fallback to an active story
		if (story && !story.hidden()) {
			await this.activateStory(storyData, story);
		}
	}
}
