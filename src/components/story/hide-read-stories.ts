import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import { createServicesManager } from '@/services/manager.ts';
import type { ReadStoriesService } from '@/services/read-stories-service.ts';
import { parseHNStoriesPage } from '@/utils/hn-parser.ts';
import lStorage from '@/utils/localStorage.ts';

const allowedPaths = [
	'/',
	'/ask',
	'/newest',
	'/news',
	'/show',
	'/jobs',
	'/front',
	'/active',
	'/past',
	'/noobstories',
	'/classic',
	'/shownew',
	'/pool',
	'/best',
	'/launches',
	'/flagged',
];
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

export const hideStories = (storyIds: string[], doc: Document): void => {
	for (const id of storyIds) {
		const storyRow = doc.getElementById(id);
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

export const showStories = (storyIds: string[], doc: Document): void => {
	for (const id of storyIds) {
		const storyRow = doc.getElementById(id);
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

export interface StorageState {
	checkbox: boolean;
}

export const setupCheckbox = async (
	bigbox: Element,
	doc: Document
): Promise<HTMLInputElement | null> => {
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

const getVisitedStoryIds = async (
	service: ReadStoriesService,
	hnStories: HNStory[]
): Promise<string[] | undefined> => {
	const response = await service.getVisits(hnStories);
	if (!response) {
		return;
	}
	return response.filter((story: HNStory) => story.latestVisit).map((story: HNStory) => story.id);
};

export const hideReadStories = async (ctx: ContentScriptContext, doc: Document) => {
	if (
		!allowedPaths.includes(window.location.pathname) ||
		window.location.search.includes('kind=comment')
	) {
		return;
	}

	const bigbox = doc.querySelector('#bigbox');
	if (!bigbox) {
		return;
	}

	const checkbox = await setupCheckbox(bigbox, doc);
	if (!checkbox) {
		return;
	}

	const service = createServicesManager().getReadStoriesService();

	try {
		const hnStories = parseHNStoriesPage(doc);
		let readStoryIds: string[] | undefined;

		const updateVisits = async () => {
			readStoryIds = await getVisitedStoryIds(service, hnStories);
			if (!readStoryIds) {
				return;
			}
			checkbox.checked ? hideStories(readStoryIds, doc) : showStories(readStoryIds, doc);
		};
		await updateVisits();

		const handleCheckboxChange = async () => {
			await updateVisits();
			await lStorage.setItem<StorageState>(STORAGE_KEY, { checkbox: checkbox.checked });
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
};
