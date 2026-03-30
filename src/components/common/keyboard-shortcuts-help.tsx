import { browser } from '#imports';
import './keyboard-shortcuts-help.css';

const SHORTCUTS_COMMENTS = [
	{ key: 'j / J', description: 'Move down by one / jump to same or higher-level comment' },
	{ key: 'k / K', description: 'Move up by one / jump to same or higher-level comment' },
	{ key: 'n / p', description: 'Move down / up and expand collapsed comments' },
	{ key: 'N / P', description: 'Move down / up at same indent level' },
	{ key: 'c', description: 'Collapse/expand comment thread' },
	{ key: 'r', description: 'Reply to selected comment' },
	{ key: 'u', description: 'Upvote selected comment' },
	{ key: 'd', description: 'Downvote selected comment' },
	{ key: 'f', description: 'Favorite selected comment' },
	{ key: 'X', description: 'Flag selected comment' },
	{ key: '0-9', description: 'Open reference link by number' },
	{ key: 't', description: 'Scroll to top of page' },
	{ key: 'b', description: 'Go back (if paginated)' },
	{ key: 'esc', description: 'Unfocus comment or close reply box' },
] as const;

const SHORTCUTS_STORIES = [
	{ key: '↑ / ↓', description: 'Move up / down' },
	{ key: '←', description: 'Open story comments (new tab)' },
	{ key: '⇧ + ←', description: 'Open story comments' },
	{ key: '→', description: 'Open story url (new tab)' },
	{ key: '⇧ + →', description: 'Open story url' },
	{ key: 'j / k', description: 'Move down / up' },
	{ key: 'Enter', description: 'Open selected story in new tab' },
	{ key: 'O', description: 'Open story and comments in new tabs' },
	{ key: 'u', description: 'Upvote selected story' },
	{ key: 'f', description: 'Favorite selected story' },
	{ key: 'X', description: 'Flag selected story' },
	{ key: 'r', description: 'Reply to story (go to comments)' },
	{ key: '1-9, 0', description: 'Open story at position 1-10' },
	{ key: 'm', description: 'Click more link' },
	{ key: 'b', description: 'Go back (if paginated)' },
	{ key: 'h', description: 'Toggle hide read stories checkbox' },
	{ key: 'H', description: 'Hide read stories' },
	{ key: 'esc', description: 'Unfocus story' },
] as const;

const SHORTCUTS_COMMON = [
	{ key: 'H', description: 'Home' },
	{ key: 'S', description: 'Submit' },
	{ key: 'O', description: 'Show' },
	{ key: 'A', description: 'Ask' },
	{ key: 'N', description: 'New' },
	{ key: 'P', description: 'Profile' },
	{ key: 'T', description: 'Threads' },
	{ key: '?', description: 'Show help dialog' },
	{ key: 'esc', description: 'Hide help dialog' },
] as const;

const LOGO_PATH = '/icon/orange_juice_icon_128x128.png';
const WEBSITE_URL = 'https://oj-hn.com';
const EMAIL = 'hello@oj-hn.com';
const GITHUB_URL = 'https://github.com/OrangeJuiceExtension/OrangeJuice';

const getLogoUrl = (): string => browser.runtime?.getURL?.(LOGO_PATH) ?? LOGO_PATH;

const appendShortcutTable = (
	doc: Document,
	parent: HTMLElement,
	shortcuts: ReadonlyArray<{ key: string; description: string }>
): void => {
	const table = doc.createElement('table');
	table.className = 'oj-shortcuts-help__table';
	const tbody = doc.createElement('tbody');

	for (const { key, description } of shortcuts) {
		const row = doc.createElement('tr');
		const keyCell = doc.createElement('td');
		keyCell.className = 'oj-shortcuts-help__key';
		keyCell.textContent = key;
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
	appendShortcutTable(doc, navColumn, SHORTCUTS_COMMON);

	topRow.append(brand, navColumn);

	const bottomRow = doc.createElement('div');
	bottomRow.className = 'oj-shortcuts-help__row';

	const storiesColumn = createColumn(doc, 'Stories shortcuts');
	appendShortcutTable(doc, storiesColumn, SHORTCUTS_STORIES);

	const commentsColumn = createColumn(doc, 'Comments shortcuts');
	appendShortcutTable(doc, commentsColumn, SHORTCUTS_COMMENTS);

	bottomRow.append(storiesColumn, commentsColumn);
	container.append(topRow, bottomRow);

	return container;
};
