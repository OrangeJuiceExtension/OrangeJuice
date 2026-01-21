import { type Browser, browser } from 'wxt/browser';
import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import { parseHNStoriesPage } from '@/utils/hn-parser.ts';
import { paths } from '@/utils/paths.ts';
import type { ComponentFeature } from '@/utils/types.ts';

const allowedPaths = ['/', '/ask', '/newest', '/news', '/show', '/jobs', '/front'];
const CHECKBOX_ID = 'oj-hide-read-stories';
const STORAGE_KEY = 'oj_hide_read_stories';

export const createCheckbox = () => {
	const row = document.createElement('tr');
	const cell = document.createElement('td');
	cell.style.paddingLeft = '5px';
	cell.style.paddingBottom = '10px';

	const label = document.createElement('label');
	label.style.cursor = 'pointer';
	label.style.userSelect = 'none';

	const checkbox = document.createElement('input');
	checkbox.type = 'checkbox';
	checkbox.id = CHECKBOX_ID;
	checkbox.style.marginRight = '5px';

	label.appendChild(checkbox);
	label.appendChild(document.createTextNode('Hide read stories'));
	cell.appendChild(label);
	row.appendChild(cell);

	return { row, checkbox };
};

export const hideStories = (storyIds: string[]): void => {
	for (const id of storyIds) {
		const storyRow = document.getElementById(id);
		if (!storyRow) {
			continue;
		}

		const subtextRow = storyRow.nextElementSibling;
		const spacerRow = subtextRow?.nextElementSibling;

		storyRow.style.display = 'none';

		if (subtextRow) {
			(subtextRow as HTMLElement).style.display = 'none';
		}
		if (spacerRow) {
			(spacerRow as HTMLElement).style.display = 'none';
		}
	}
};

export const showStories = (storyIds: string[]): void => {
	for (const id of storyIds) {
		const storyRow = document.getElementById(id);
		if (!storyRow) {
			continue;
		}

		const subtextRow = storyRow.nextElementSibling;
		const spacerRow = subtextRow?.nextElementSibling;

		storyRow.style.display = '';

		if (subtextRow) {
			(subtextRow as HTMLElement).style.display = '';
		}
		if (spacerRow) {
			(spacerRow as HTMLElement).style.display = '';
		}
	}
};

// This is called from the background/index.ts file, but kept here to keep background cleaner
export const handleHideReadStories = async (
	message: GetHistoryMessage,
	_sender: Browser.runtime.MessageSender,
	sendResponse: (msg: GetHistoryMessage) => void
) => {
	try {
		if (message.id === 'getVisits') {
			const visitPromises = message.stories.map((story) =>
				browser.history.getVisits({ url: story.url })
					.then((visits) => {
						if (visits.length > 0) {
							story.latestVisit = visits[0];
						}
						return story;
					})
					.catch((e) => {
						console.error('Error fetching visit history for story:', story, e);
						return story;
					})
			);

			const storiesWithVisits = await Promise.all(visitPromises);

			return sendResponse({
				id: 'handleHideReadStories',
				stories: storiesWithVisits,
			} as GetHistoryMessage);
		}
	} catch (e) {
		console.error('Error in handleHideReadStories:', e);
	}
};

interface GetHistoryMessage {
	id: 'getVisits' | 'handleHideReadStories';
	stories: HNStory[];
}

export const setupCheckbox = (bigbox: Element): HTMLInputElement | null => {
	if (!bigbox.parentElement) {
		return null;
	}

	const { row, checkbox } = createCheckbox();
	bigbox.parentElement.insertBefore(row, bigbox);

	const storedState = localStorage.getItem(STORAGE_KEY);
	if (storedState == null) {
		localStorage.setItem(STORAGE_KEY, JSON.stringify({ checkbox: false }));
	} else {
		checkbox.checked = JSON.parse(storedState).checkbox ?? false;
	}

	return checkbox;
};

const getVisitedStoryIds = async (hnStories: HNStory[]): Promise<string[] | undefined> => {
	const response = await browser.runtime.sendMessage({
		id: 'getVisits',
		stories: hnStories,
	} as GetHistoryMessage);
	if (!response || response.id !== 'handleHideReadStories') {
		return;
	}
	return response.stories
		.filter((story: HNStory) => story.latestVisit)
		.map((story: HNStory) => story.id);
};

export const hideReadStories: ComponentFeature = {
	id: 'hide_read_stories',
	loginRequired: true,
	matches: [`${paths.base}/*`],
	runAt: 'document_end',
	async main(ctx: ContentScriptContext) {
		if (!allowedPaths.includes(window.location.pathname)) {
			return;
		}

		const bigbox = document.querySelector('#bigbox');
		if (!bigbox) {
			return;
		}

		const checkbox = setupCheckbox(bigbox);
		if (!checkbox) {
			return;
		}

		try {
			const hnStories = parseHNStoriesPage(document);
			let readStoryIds: string[] | undefined;

			const updateVisits = async () => {
				readStoryIds = await getVisitedStoryIds(hnStories);
				if (!readStoryIds) {
					return;
				}
				checkbox.checked ? hideStories(readStoryIds) : showStories(readStoryIds);
			};
			await updateVisits();

			const handleCheckboxChange = async () => {
				await updateVisits();
				localStorage.setItem(STORAGE_KEY, JSON.stringify({ checkbox: checkbox.checked }));
			};

			checkbox.addEventListener('change', handleCheckboxChange);

			const pageshow = async () => {
				await updateVisits();
			};
			// When you click the back button, this even gets fired
			window.addEventListener('pageshow', pageshow);

			ctx.onInvalidated(() => {
				checkbox.removeEventListener('change', handleCheckboxChange);
				window.removeEventListener('pageshow', pageshow);
			});
		} catch (e) {
			console.error('Error in hideReadStories component:', e);
		}
	},
};
