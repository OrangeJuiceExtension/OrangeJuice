import { browser } from '#imports';
import { type KeyboardCommand, keyboardCommands } from '@/components/common/keyboard-commands.ts';
import './keyboard-shortcuts-help.css';

const LOGO_PATH = '/icon/orange_juice_icon_128x128.png';
const WEBSITE_URL = 'https://oj-hn.com';
const EMAIL = 'hello@oj-hn.com';
const GITHUB_URL = 'https://github.com/OrangeJuiceExtension/OrangeJuice';

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

export const getKeyboardShortcutsHelp = (doc: Document): HTMLElement => {
	const container = doc.createElement('div');
	container.className = 'oj-shortcuts-help';

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
	brand.append(logo, links);

	const navColumn = createColumn(doc, 'Navigation shortcuts');
	const note = doc.createElement('div');
	note.className = 'oj-shortcuts-help__note';
	note.textContent = '(requires alt or ⌥)';
	navColumn.append(note);
	appendShortcutTable(doc, navColumn, keyboardCommands.navigation);

	topRow.append(brand, navColumn);

	const bottomRow = doc.createElement('div');
	bottomRow.className = 'oj-shortcuts-help__row';

	const storiesColumn = createColumn(doc, 'Stories shortcuts');
	appendShortcutTable(doc, storiesColumn, keyboardCommands.stories);

	const commentsColumn = createColumn(doc, 'Comments shortcuts');
	appendShortcutTable(doc, commentsColumn, keyboardCommands.comments);

	bottomRow.append(storiesColumn, commentsColumn);
	container.append(topRow, bottomRow);

	return container;
};
