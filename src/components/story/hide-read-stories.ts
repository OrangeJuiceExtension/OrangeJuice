import type { ContentScriptContext } from '#imports';
import type { HNStory } from '@/components/story/hn-story.ts';
import type { StoryData } from '@/components/story/story-data.ts';
import { createClientServices } from '@/services/manager.ts';
import type { ReadStoriesService, ReadStoryLookup } from '@/services/read-stories-service.ts';
import lStorage from '@/utils/local-storage.ts';
import { getShowHiddenStoriesOptionPreference } from '@/utils/preferences.ts';
import { registerPreferencesUpdateHandler } from '@/utils/preferences-live.ts';

const CHECKBOX_ID = 'oj-hide-read-stories';
const STORAGE_KEY = 'oj_hide_read_stories';

export const createCheckbox = (doc: Document) => {
	const row = doc.createElement('tr');
	const cell = doc.createElement('td');
	cell.style.paddingLeft = '5px';
	cell.style.paddingBottom = '10px';

	const label = doc.createElement('label');
	label.style.cursor = 'pointer';
	label.style.userSelect = 'none';

	const checkbox = doc.createElement('input');
	checkbox.type = 'checkbox';
	checkbox.id = CHECKBOX_ID;
	checkbox.style.marginRight = '5px';

	label.appendChild(checkbox);
	label.appendChild(doc.createTextNode('Hide read stories'));
	cell.appendChild(label);
	row.appendChild(cell);

	return { row, checkbox };
};

export const STORY_HIDDEN = 'oj_story_hidden';

const setDisplay = (readStories: HNStory[], display: string) => {
	for (const story of readStories) {
		if (display === 'none') {
			story.hide();
		} else {
			story.show();
		}
	}
};

export const hideStories = (readStories: HNStory[]): void => {
	setDisplay(readStories, 'none');
};

export const showStories = (readStories: HNStory[]): void => {
	setDisplay(readStories, '');
};

export interface StorageState {
	checkbox: boolean;
}

export const setupCheckbox = async (
	bigbox: Element,
	doc: Document
): Promise<HTMLInputElement | null> => {
	if (!(await getShowHiddenStoriesOptionPreference())) {
		return null;
	}

	if (!bigbox.parentElement) {
		return null;
	}

	const { row, checkbox } = createCheckbox(doc);
	bigbox.parentElement.insertBefore(row, bigbox);

	const storedState = await lStorage.getItem<StorageState>(STORAGE_KEY, { fallback: undefined });
	if (storedState && storedState.checkbox !== undefined) {
		checkbox.checked = storedState.checkbox;
	} else {
		await lStorage.setItem<StorageState>(STORAGE_KEY, { checkbox: false });
	}

	return checkbox;
};

const getVisitedStories = async (
	service: ReadStoriesService,
	hnStories: HNStory[]
): Promise<HNStory[]> => {
	try {
		const storiesToLookup: ReadStoryLookup[] = hnStories.map((story) => ({
			id: story.id,
			url: story.url,
		}));
		const response = await service.getVisits(storiesToLookup);
		if (!response) {
			return [];
		}

		const map = new Map(hnStories.map((item) => [item.id, item]));

		const ret: HNStory[] = [];
		for (const story of response) {
			if (story.latestVisit) {
				const found = map.get(story.id);
				if (found) {
					found.latestVisit = story.latestVisit;
					found.hide();
					ret.push(found);
				}
			}
		}
		return ret;
	} catch (e) {
		console.error({ error: 'Error in getVisitedStoryIds', e });
		return [];
	}
};

export const hideReadStories = async (
	ctx: ContentScriptContext,
	doc: Document,
	storyData: StoryData
) => {
	try {
		const service = createClientServices().getReadStoriesService();
		const updateVisits = async () => {
			const readStories = await getVisitedStories(service, storyData.hnStories);
			if (!readStories) {
				return;
			}
			checkbox.checked ? hideStories(readStories) : showStories(readStories);
		};
		let checkbox: HTMLInputElement | null = null;
		let handleCheckboxChange: (() => Promise<void>) | null = null;

		const cleanupCheckbox = () => {
			if (checkbox && handleCheckboxChange) {
				checkbox.removeEventListener('change', handleCheckboxChange);
			}
			checkbox?.closest('tr')?.remove();
			checkbox = null;
			handleCheckboxChange = null;
		};

		const syncCheckboxVisibility = async (): Promise<void> => {
			if (!(await getShowHiddenStoriesOptionPreference())) {
				cleanupCheckbox();
				const readStories = await getVisitedStories(service, storyData.hnStories);
				showStories(readStories);
				return;
			}

			if (!checkbox) {
				checkbox = await setupCheckbox(storyData.bigbox, doc);
				if (!checkbox) {
					return;
				}

				handleCheckboxChange = async () => {
					await updateVisits();
					if (!checkbox) {
						return;
					}
					await lStorage.setItem<StorageState>(STORAGE_KEY, {
						checkbox: checkbox.checked,
					});
				};

				checkbox.addEventListener('change', handleCheckboxChange);
			}

			await updateVisits();
		};

		try {
			await syncCheckboxVisibility();
		} catch (e) {
			console.log({ error: 'error update visits', e });
		}

		const pageshow = async () => {
			await syncCheckboxVisibility();
		};
		// When you click the back button, this even gets fired
		window.addEventListener('pageshow', pageshow);
		registerPreferencesUpdateHandler(ctx, syncCheckboxVisibility);

		ctx.onInvalidated(() => {
			cleanupCheckbox();
			// window.removeEventListener('pageshow', pageshow);
		});
	} catch (e) {
		console.error({ error: 'Error in hideread stories', e });
	}
};

export const hideReadStoriesOnce = async (storyData: StoryData): Promise<void> => {
	try {
		const service = createClientServices().getReadStoriesService();
		const readStories = await getVisitedStories(service, storyData.hnStories);
		if (!readStories) {
			return;
		}
		hideStories(readStories);
	} catch (e) {
		console.error({ error: 'Error in hideReadStoriesOnce', e });
	}
};
