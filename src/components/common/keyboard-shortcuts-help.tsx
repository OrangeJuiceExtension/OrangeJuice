import { browser } from '#imports';
import {
	getKeyboardCommandConfig,
	type KeyboardCommand,
	loadKeyboardCommandConfig,
	parseKeyboardCommandConfig,
	saveKeyboardCommandConfig,
	serializeKeyboardCommandConfig,
} from '@/components/common/keyboard-commands.ts';
import './keyboard-shortcuts-help.css';

const LOGO_PATH = '/icon/orange_juice_icon_128x128.png';
const WEBSITE_URL = 'https://oj-hn.com';
const EMAIL = 'hello@oj-hn.com';
const GITHUB_URL = 'https://github.com/OrangeJuiceExtension/OrangeJuice';
const SHORTCUTS_FILENAME = 'orange-juice-keyboard-shortcuts.json';

const getLogoUrl = (): string => browser.runtime?.getURL?.(LOGO_PATH) ?? LOGO_PATH;

const appendShortcutTable = (
	doc: Document,
	parent: HTMLElement,
	shortcuts: readonly KeyboardCommand[]
): void => {
	const table = doc.createElement('table');
	table.className = 'oj-shortcuts-help__table';
	const tbody = doc.createElement('tbody');

	for (const { displayKey, description, showInHelp = true } of shortcuts) {
		if (!showInHelp) {
			continue;
		}

		const row = doc.createElement('tr');
		const keyCell = doc.createElement('td');
		keyCell.className = 'oj-shortcuts-help__key';
		keyCell.textContent = displayKey;
		const descCell = doc.createElement('td');
		descCell.className = 'oj-shortcuts-help__desc';
		descCell.textContent = description;
		row.append(keyCell, descCell);
		tbody.append(row);
	}

	table.append(tbody);
	parent.append(table);
};

const createExternalLink = (doc: Document, href: string, label: string): HTMLAnchorElement => {
	const link = doc.createElement('a');
	link.href = href;
	link.rel = 'noopener noreferrer';
	link.target = '_blank';
	link.textContent = label;
	return link;
};

const createColumn = (doc: Document, heading: string): HTMLDivElement => {
	const column = doc.createElement('div');
	column.className = 'oj-shortcuts-help__column';
	const title = doc.createElement('h2');
	title.className = 'oj-shortcuts-help__heading';
	title.textContent = heading;
	column.append(title);
	return column;
};

const createButton = (doc: Document, label: string, className?: string): HTMLButtonElement => {
	const button = doc.createElement('button');
	button.className = className ?? 'oj-shortcuts-help__button';
	button.textContent = label;
	button.type = 'button';
	return button;
};

const setEditorError = (error: HTMLElement, message: string): void => {
	error.hidden = false;
	error.textContent = message;
};

const getErrorMessage = (error: unknown): string =>
	error instanceof Error ? error.message : 'Shortcut JSON is invalid.';

const renderShortcuts = (doc: Document, container: HTMLElement, message?: string): void => {
	const topRow = doc.createElement('div');
	topRow.className = 'oj-shortcuts-help__row oj-shortcuts-help__row--top';

	const brand = doc.createElement('div');
	brand.className = 'oj-shortcuts-help__brand';
	const logo = doc.createElement('img');
	logo.alt = 'Orange Juice logo';
	logo.className = 'oj-shortcuts-help__logo';
	logo.height = 128;
	logo.src = getLogoUrl();
	logo.width = 128;

	const links = doc.createElement('div');
	links.className = 'oj-shortcuts-help__links';
	links.append(
		createExternalLink(doc, WEBSITE_URL, 'Website'),
		createExternalLink(doc, GITHUB_URL, 'GitHub'),
		createExternalLink(doc, `mailto:${EMAIL}?subject=Question about OJ`, 'Email')
	);
	const editButton = createButton(doc, 'Edit shortcuts', 'oj-shortcuts-help__edit-button');
	editButton.addEventListener('click', () => {
		renderEditor(doc, container);
	});
	brand.append(logo, links, editButton);
	if (message) {
		const status = doc.createElement('div');
		status.className = 'oj-shortcuts-help__status';
		status.role = 'status';
		status.textContent = message;
		brand.append(status);
	}

	const keyboardCommandConfig = getKeyboardCommandConfig();

	const navColumn = createColumn(doc, 'Navigation shortcuts');
	appendShortcutTable(doc, navColumn, keyboardCommandConfig.navigation);

	topRow.append(brand, navColumn);

	const bottomRow = doc.createElement('div');
	bottomRow.className = 'oj-shortcuts-help__row';

	const storiesColumn = createColumn(doc, 'Stories shortcuts');
	appendShortcutTable(doc, storiesColumn, keyboardCommandConfig.stories);

	const commentsColumn = createColumn(doc, 'Comments shortcuts');
	appendShortcutTable(doc, commentsColumn, keyboardCommandConfig.comments);

	bottomRow.append(storiesColumn, commentsColumn);
	container.replaceChildren(topRow, bottomRow);
};

const downloadShortcuts = (doc: Document, textarea: HTMLTextAreaElement): void => {
	const blob = new Blob([textarea.value], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const link = doc.createElement('a');
	link.href = url;
	link.download = SHORTCUTS_FILENAME;
	link.rel = 'noopener';
	doc.body.append(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
};

const renderEditor = (doc: Document, container: HTMLElement): void => {
	const editor = doc.createElement('div');
	editor.className = 'oj-shortcuts-editor';

	const heading = doc.createElement('h2');
	heading.className = 'oj-shortcuts-help__heading';
	heading.textContent = 'Edit keyboard shortcuts';

	const textarea = doc.createElement('textarea');
	textarea.className = 'oj-shortcuts-editor__textarea';
	textarea.spellcheck = false;
	textarea.value = serializeKeyboardCommandConfig();
	textarea.setAttribute('aria-label', 'Keyboard shortcuts JSON');

	const error = doc.createElement('div');
	error.className = 'oj-shortcuts-editor__error';
	error.hidden = true;
	error.role = 'alert';

	const fileInput = doc.createElement('input');
	fileInput.accept = '.json,application/json';
	fileInput.className = 'oj-shortcuts-editor__file-input';
	fileInput.type = 'file';

	fileInput.addEventListener('change', async () => {
		const file = fileInput.files?.[0];
		fileInput.value = '';
		if (!file) {
			return;
		}
		if (!file.name.toLowerCase().endsWith('.json')) {
			setEditorError(error, 'Choose a .json file.');
			return;
		}

		try {
			const text = await file.text();
			const config = parseKeyboardCommandConfig(text);
			textarea.value = serializeKeyboardCommandConfig(config);
			error.hidden = true;
			error.textContent = '';
		} catch (parseError) {
			setEditorError(error, getErrorMessage(parseError));
		}
	});

	const controls = doc.createElement('div');
	controls.className = 'oj-shortcuts-editor__controls';

	const uploadButton = createButton(doc, 'Upload JSON');
	uploadButton.addEventListener('click', () => {
		fileInput.click();
	});

	const downloadButton = createButton(doc, 'Download JSON');
	downloadButton.addEventListener('click', () => {
		downloadShortcuts(doc, textarea);
	});

	const cancelButton = createButton(doc, 'Cancel');
	cancelButton.addEventListener('click', () => {
		renderShortcuts(doc, container);
	});

	const saveButton = createButton(doc, 'Save shortcuts', 'oj-shortcuts-help__button primary');
	saveButton.addEventListener('click', async () => {
		try {
			await saveKeyboardCommandConfig(textarea.value);
			renderShortcuts(doc, container, 'Keyboard shortcuts saved.');
		} catch (saveError) {
			setEditorError(error, getErrorMessage(saveError));
		}
	});

	controls.append(uploadButton, downloadButton, cancelButton, saveButton);
	editor.append(heading, textarea, error, controls, fileInput);
	container.replaceChildren(editor);
};

export const getKeyboardShortcutsHelp = async (doc: Document): Promise<HTMLElement> => {
	await loadKeyboardCommandConfig();

	const container = doc.createElement('div');
	container.className = 'oj-shortcuts-help';
	renderShortcuts(doc, container);

	return container;
};
