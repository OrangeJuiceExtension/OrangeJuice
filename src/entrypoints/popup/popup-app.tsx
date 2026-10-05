import { browser } from '#imports';
import { type DarkModePreference, getDarkModePreference } from '@/utils/dark-mode.ts';
import {
	ENABLE_FOCUS_BOX_STORAGE_KEY,
	getEnableFocusBoxPreference,
	getOpenStoryNewTabPreference,
	getReadStoriesVisibilityPreference,
	getShowHiddenStoriesOptionPreference,
	OPEN_STORY_NEW_TAB_STORAGE_KEY,
	READ_STORIES_VISIBILITY,
	READ_STORIES_VISIBILITY_STORAGE_KEY,
	type ReadStoriesVisibilityPreference,
	SHOW_HIDDEN_STORIES_OPTION_STORAGE_KEY,
	setEnableFocusBoxPreference,
	setOpenStoryNewTabPreference,
	setReadStoriesVisibilityPreference,
	setShowHiddenStoriesOptionPreference,
} from '@/utils/preferences.ts';
import { PREFERENCES_UPDATED_MESSAGE_TYPE } from '@/utils/preferences-live.ts';
import './App.css';

const WELCOME_PATH = '/welcome.html';

interface ToggleDefinition {
	description: string;
	id: string;
	label: string;
}

interface SelectDefinition {
	description: string;
	id: string;
	label: string;
	options: ReadonlyArray<{
		label: string;
		value: ReadStoriesVisibilityPreference;
	}>;
}

const READ_STORIES_VISIBILITY_OPTIONS = [
	{ label: 'Hide', value: READ_STORIES_VISIBILITY.HIDE },
	{ label: 'Strikethrough', value: READ_STORIES_VISIBILITY.STRIKETHROUGH },
	{ label: 'Dim', value: READ_STORIES_VISIBILITY.DIM },
] as const;

const notifyActiveTabPreferencesUpdated = async (): Promise<void> => {
	const tabs = await browser.tabs.query({
		active: true,
		currentWindow: true,
	});
	const activeTabId = tabs[0]?.id;
	if (activeTabId === undefined) {
		return;
	}

	try {
		await browser.tabs.sendMessage(activeTabId, {
			type: PREFERENCES_UPDATED_MESSAGE_TYPE,
		});
	} catch (error: unknown) {
		console.error({
			error: 'Failed to notify active tab of preference changes',
			errorDetail: error,
		});
	}
};

const createToggle = (doc: Document, toggle: ToggleDefinition): HTMLLabelElement => {
	const label = doc.createElement('label');
	label.className = 'oj-popup__toggle';
	label.htmlFor = toggle.id;

	const copy = doc.createElement('span');
	copy.className = 'oj-popup__toggle-copy';

	const labelText = doc.createElement('span');
	labelText.className = 'oj-popup__toggle-title';
	labelText.id = `${toggle.id}-label`;
	labelText.textContent = toggle.label;

	const hintText = doc.createElement('span');
	hintText.className = 'oj-popup__toggle-hint';
	hintText.id = `${toggle.id}-hint`;
	hintText.textContent = toggle.description;

	copy.append(labelText, hintText);

	const checkbox = doc.createElement('input');
	checkbox.className = 'oj-popup__checkbox';
	checkbox.id = toggle.id;
	checkbox.name = toggle.id;
	checkbox.type = 'checkbox';
	checkbox.setAttribute('aria-labelledby', labelText.id);
	checkbox.setAttribute('aria-describedby', hintText.id);

	label.append(copy, checkbox);
	return label;
};

const createSelectSetting = (doc: Document, setting: SelectDefinition): HTMLLabelElement => {
	const label = doc.createElement('label');
	label.className = 'oj-popup__toggle';
	label.htmlFor = setting.id;

	const copy = doc.createElement('span');
	copy.className = 'oj-popup__toggle-copy';

	const labelText = doc.createElement('span');
	labelText.className = 'oj-popup__toggle-title';
	labelText.id = `${setting.id}-label`;
	labelText.textContent = setting.label;

	const hintText = doc.createElement('span');
	hintText.className = 'oj-popup__toggle-hint';
	hintText.id = `${setting.id}-hint`;
	hintText.textContent = setting.description;

	copy.append(labelText, hintText);

	const select = doc.createElement('select');
	select.className = 'oj-popup__select';
	select.id = setting.id;
	select.name = setting.id;
	select.setAttribute('aria-labelledby', labelText.id);
	select.setAttribute('aria-describedby', hintText.id);

	for (const optionDefinition of setting.options) {
		const option = doc.createElement('option');
		option.textContent = optionDefinition.label;
		option.value = String(optionDefinition.value);
		select.append(option);
	}

	label.append(copy, select);
	return label;
};

const createSettingsGroup = (
	doc: Document,
	title: string
): {
	container: HTMLElement;
	settings: HTMLElement;
} => {
	const container = doc.createElement('section');
	container.className = 'oj-popup__group';

	const heading = doc.createElement('h2');
	heading.className = 'oj-popup__group-title';
	heading.textContent = title;

	const settings = doc.createElement('div');
	settings.className = 'oj-popup__group-settings';

	container.append(heading, settings);
	return { container, settings };
};

const createPopupContent = (doc: Document): HTMLElement => {
	const main = doc.createElement('main');
	main.className = 'oj-popup oj-popup--light';

	const header = doc.createElement('header');
	header.className = 'oj-popup__header';

	const brand = doc.createElement('a');
	brand.className = 'oj-popup__brand';
	brand.href = 'https://oj-hn.com';
	brand.rel = 'noopener';
	brand.target = '_blank';
	brand.append('Orange ');
	const brandSuffix = doc.createElement('span');
	brandSuffix.textContent = 'Juice';
	brand.append(brandSuffix);

	const title = doc.createElement('h1');
	title.className = 'oj-popup__title';
	title.textContent = 'Preferences';
	header.append(brand, title);

	const footer = doc.createElement('footer');
	footer.className = 'oj-popup__footer';
	const saveNote = doc.createElement('span');
	saveNote.textContent = 'Changes save automatically.';

	const welcomeLink = doc.createElement('a');
	welcomeLink.className = 'oj-popup__welcome-link';
	welcomeLink.href = browser.runtime.getURL(WELCOME_PATH);
	welcomeLink.rel = 'noopener';
	welcomeLink.target = '_blank';
	welcomeLink.textContent = 'Welcome guide';
	footer.append(saveNote, welcomeLink);

	const settingsList = doc.createElement('div');
	settingsList.className = 'oj-popup__settings';

	const readStoriesGroup = createSettingsGroup(doc, 'Read stories');
	const navigationGroup = createSettingsGroup(doc, 'Browsing');

	const showHiddenStoriesOptionLabel = createToggle(doc, {
		description: 'Turn off to always apply the style below.',
		id: SHOW_HIDDEN_STORIES_OPTION_STORAGE_KEY,
		label: 'Show read stories checkbox',
	});
	const readStoriesVisibilityLabel = createSelectSetting(doc, {
		description: 'How visited stories are displayed.',
		id: READ_STORIES_VISIBILITY_STORAGE_KEY,
		label: 'Appearance',
		options: READ_STORIES_VISIBILITY_OPTIONS,
	});
	const focusBoxLabel = createToggle(doc, {
		description: 'Outline the selected story or comment.',
		id: ENABLE_FOCUS_BOX_STORAGE_KEY,
		label: 'Show focus box',
	});
	const openStoryNewTabLabel = createToggle(doc, {
		description: 'Keep your place on Hacker News.',
		id: OPEN_STORY_NEW_TAB_STORAGE_KEY,
		label: 'Open stories in a new tab',
	});

	readStoriesGroup.settings.append(showHiddenStoriesOptionLabel, readStoriesVisibilityLabel);
	navigationGroup.settings.append(focusBoxLabel, openStoryNewTabLabel);
	settingsList.append(readStoriesGroup.container, navigationGroup.container);
	main.append(header, settingsList, footer);
	return main;
};

const applyPopupTheme = (popup: HTMLElement, theme: DarkModePreference): void => {
	popup.className = `oj-popup oj-popup--${theme}`;
};

export const renderPopupApp = async (doc: Document, root: HTMLElement): Promise<void> => {
	const popup = createPopupContent(doc);
	root.replaceChildren(popup);

	applyPopupTheme(popup, await getDarkModePreference());

	const showHiddenStoriesOptionCheckbox = popup.querySelector<HTMLInputElement>(
		`#${SHOW_HIDDEN_STORIES_OPTION_STORAGE_KEY}`
	);
	if (!showHiddenStoriesOptionCheckbox) {
		throw new Error('Show hidden stories option checkbox is missing from popup UI.');
	}

	showHiddenStoriesOptionCheckbox.checked = await getShowHiddenStoriesOptionPreference();
	showHiddenStoriesOptionCheckbox.addEventListener('change', async () => {
		await setShowHiddenStoriesOptionPreference(showHiddenStoriesOptionCheckbox.checked);
		await notifyActiveTabPreferencesUpdated();
	});

	const readStoriesVisibilitySelect = popup.querySelector<HTMLSelectElement>(
		`#${READ_STORIES_VISIBILITY_STORAGE_KEY}`
	);
	if (!readStoriesVisibilitySelect) {
		throw new Error('Read stories visibility select is missing from popup UI.');
	}

	readStoriesVisibilitySelect.value = String(await getReadStoriesVisibilityPreference());
	readStoriesVisibilitySelect.addEventListener('change', async () => {
		const visibility = Number.parseInt(
			readStoriesVisibilitySelect.value,
			10
		) as ReadStoriesVisibilityPreference;
		await setReadStoriesVisibilityPreference(visibility);
		await notifyActiveTabPreferencesUpdated();
	});

	const checkbox = popup.querySelector<HTMLInputElement>(`#${ENABLE_FOCUS_BOX_STORAGE_KEY}`);
	if (!checkbox) {
		throw new Error('Focus box checkbox is missing from popup UI.');
	}

	checkbox.checked = await getEnableFocusBoxPreference();
	checkbox.addEventListener('change', async () => {
		await setEnableFocusBoxPreference(checkbox.checked);
		await notifyActiveTabPreferencesUpdated();
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
		await notifyActiveTabPreferencesUpdated();
	});
};
