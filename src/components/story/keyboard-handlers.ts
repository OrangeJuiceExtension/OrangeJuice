import { hideReadStoriesOnce } from '@/components/story/hide-read-stories.ts';
import type { HNStory } from '@/components/story/hn-story.ts';
import type { StoryData } from '@/components/story/story-data.ts';
import { dom } from '@/utils/dom.ts';
import lStorage from '@/utils/local-storage.ts';

const PAGE_PARAM_REGEX = /[?&]p=\d+/;
const CHECKBOX_ID = 'oj-hide-read-stories';
const NAV_STATE_KEY = 'oj_page_nav_state';
const ACTIVE_STORY_KEY = 'oj_active_story_id2';

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
	async escape(storyData: StoryData) {
		(this.doc.activeElement as HTMLElement)?.blur();
		storyData.deactivate();
		const activeStoryMap = await this.getActiveStoryMap();
		const locationKey = this.getLocationKey();
		if (activeStoryMap[locationKey]) {
			await this.clearStoredActiveStory(activeStoryMap, locationKey);
		}
	}

	async activateStory(storyData: StoryData, story: HNStory) {
		storyData.activate(story);
		const activeStoryMap = await this.getActiveStoryMap();
		activeStoryMap[this.getLocationKey()] = story.id;
		await lStorage.setItem(ACTIVE_STORY_KEY, activeStoryMap);
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

	openStoryUrl(storyData: StoryData, openInNewTab: boolean) {
		const activeStory = storyData.getActiveStory();
		if (activeStory?.url) {
			if (openInNewTab) {
				window.open(activeStory.url, '_blank');
				return;
			}
			window.location.href = activeStory.url;
		}
	}

	openComments(storyData: StoryData, openInNewTab: boolean) {
		const activeStory = storyData.getActiveStory();
		if (activeStory?.commentsUrl) {
			if (openInNewTab) {
				window.open(activeStory.commentsUrl, '_blank');
				return;
			}
			window.location.href = activeStory.commentsUrl;
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

	async hideReadStoriesNow(storyData: StoryData) {
		await hideReadStoriesOnce(storyData);

		const activeStory = storyData.getActiveStory();
		if (activeStory) {
			const nextStory = storyData.getNext(activeStory, true);
			if (nextStory) {
				await this.activateStory(storyData, nextStory);
			} else {
				await this.escape(storyData);
			}
		}
	}

	async checkNavState(storyData: StoryData): Promise<void> {
		const activeStoryMap = await this.getActiveStoryMap();
		const locationKey = this.getLocationKey();
		const activeStoryId = activeStoryMap[locationKey];
		const navState = await lStorage.getItem<NavDirection>(NAV_STATE_KEY);

		const story = activeStoryId ? storyData.get(activeStoryId) : undefined;

		if (!story && activeStoryId) {
			await this.clearStoredActiveStory(activeStoryMap, locationKey);
		}

		const navTarget = navState ? this.getNavTarget(storyData, navState) : undefined;
		if (!story) {
			if (navTarget) {
				await this.activateWithNavStateClear(storyData, navTarget);
			}
			return;
		}

		// Prioritize an active story if in the middle of a list
		if (this.isStoryInMiddle(storyData, story) && !story.hidden()) {
			await this.activateStory(storyData, story);
			if (navState) {
				await this.clearNavState();
			}
			return;
		}

		// Handle nav state
		if (navTarget) {
			await this.activateWithNavStateClear(storyData, navTarget);
			return;
		}

		// Fallback to an active story
		if (story && !story.hidden()) {
			await this.activateStory(storyData, story);
		}
	}

	private async activateWithNavStateClear(storyData: StoryData, target: HNStory) {
		await this.activateStory(storyData, target);
		await this.clearNavState();
	}

	private async clearNavState() {
		await lStorage.setItem(NAV_STATE_KEY, null);
	}

	private getNavTarget(storyData: StoryData, navState: NavDirection) {
		return navState === 'next'
			? storyData.firstTopDownVisible()
			: storyData.firstBottomUpVisible();
	}

	private isStoryInMiddle(storyData: StoryData, story: HNStory): boolean {
		return story !== storyData.first() && story !== storyData.last();
	}

	private async clearStoredActiveStory(
		activeStoryMap: Record<string, string>,
		locationKey: string
	) {
		delete activeStoryMap[locationKey];
		await lStorage.setItem(ACTIVE_STORY_KEY, activeStoryMap);
	}

	private getLocationKey(): string {
		return `${window.location.pathname}${window.location.search}`;
	}

	private async getActiveStoryMap(): Promise<Record<string, string>> {
		const stored = await lStorage.getItem<Record<string, string>>(ACTIVE_STORY_KEY);
		if (!stored || typeof stored !== 'object') {
			return {};
		}
		return stored;
	}
}
