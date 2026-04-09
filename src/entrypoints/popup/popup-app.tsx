import { browser } from '#imports';
import { type DarkModePreference, getDarkModePreference } from '@/utils/dark-mode.ts';
import {
	ENABLE_FOCUS_BOX_STORAGE_KEY,
	getEnableFocusBoxPreference,
	getOpenStoryNewTabPreference,
	OPEN_STORY_NEW_TAB_STORAGE_KEY,
	setEnableFocusBoxPreference,
	setOpenStoryNewTabPreference,
} from '@/utils/preferences.ts';
import './App.css';

const LOGO_PATH = '/icon/orange_juice_icon_128x128.png';

const getLogoUrl = (): string => browser.runtime?.getURL?.(LOGO_PATH) ?? LOGO_PATH;

interface ToggleDefinition {
	description: string;
	id: string;
	label: string;
}

const createToggle = (doc: Document, toggle: ToggleDefinition): HTMLLabelElement => {
	const label = doc.createElement('label');
	label.className = 'oj-popup__toggle';
	label.htmlFor = toggle.id;

	const copy = doc.createElement('span');
	copy.className = 'oj-popup__toggle-copy';

	const labelText = doc.createElement('span');
	labelText.className = 'oj-popup__toggle-title';
	labelText.textContent = toggle.label;

	const hintText = doc.createElement('span');
	hintText.className = 'oj-popup__toggle-hint';
	hintText.textContent = toggle.description;

	copy.append(labelText, hintText);

	const checkbox = doc.createElement('input');
	checkbox.className = 'oj-popup__checkbox';
	checkbox.id = toggle.id;
	checkbox.name = toggle.id;
	checkbox.type = 'checkbox';

	label.append(copy, checkbox);
	return label;
};

const createPopupContent = (doc: Document): HTMLElement => {
	const main = doc.createElement('main');
	main.className = 'oj-popup oj-popup--light';

	const card = doc.createElement('section');
	card.className = 'oj-popup__card';

	const header = doc.createElement('div');
	header.className = 'oj-popup__header';

	const logo = doc.createElement('img');
	logo.alt = 'Orange Juice logo';
	logo.className = 'oj-popup__logo';
	logo.height = 64;
	logo.src = getLogoUrl();
	logo.width = 64;

	const titleGroup = doc.createElement('div');

	const title = doc.createElement('h1');
	title.className = 'oj-popup__title';
	title.textContent = 'Preferences';

	const text = doc.createElement('p');
	text.className = 'oj-popup__text';
	text.textContent = 'Control the Orange Juice.';

	titleGroup.append(title, text);
	header.append(logo, titleGroup);

	const settingsList = doc.createElement('div');
	settingsList.className = 'oj-popup__settings';

	const focusBoxLabel = createToggle(doc, {
		description: 'Display the orange selection box around stories and comments.',
		id: ENABLE_FOCUS_BOX_STORAGE_KEY,
		label: 'Show focus box',
	});
	const openStoryNewTabLabel = createToggle(doc, {
		description: 'Open story title links in a new tab.',
		id: OPEN_STORY_NEW_TAB_STORAGE_KEY,
		label: 'Open stories in new tab',
	});

	settingsList.append(focusBoxLabel, openStoryNewTabLabel);
	card.append(header, settingsList);
	main.append(card);
	return main;
};

const applyPopupTheme = (popup: HTMLElement, theme: DarkModePreference): void => {
	popup.className = `oj-popup oj-popup--${theme}`;
};

export const renderPopupApp = async (doc: Document, root: HTMLElement): Promise<void> => {
	const popup = createPopupContent(doc);
	root.replaceChildren(popup);

	applyPopupTheme(popup, await getDarkModePreference());

	const checkbox = popup.querySelector<HTMLInputElement>(`#${ENABLE_FOCUS_BOX_STORAGE_KEY}`);
	if (!checkbox) {
		throw new Error('Focus box checkbox is missing from popup UI.');
	}

	checkbox.checked = await getEnableFocusBoxPreference();
	checkbox.addEventListener('change', async () => {
		await setEnableFocusBoxPreference(checkbox.checked);
	});

	const openStoryNewTabCheckbox = popup.querySelector<HTMLInputElement>(
		`#${OPEN_STORY_NEW_TAB_STORAGE_KEY}`
	);
	if (!openStoryNewTabCheckbox) {
		throw new Error('Open story in new tab checkbox is missing from popup UI.');
	}

	openStoryNewTabCheckbox.checked = await getOpenStoryNewTabPreference();
	openStoryNewTabCheckbox.addEventListener('change', async () => {
		await setOpenStoryNewTabPreference(openStoryNewTabCheckbox.checked);
	});
};
