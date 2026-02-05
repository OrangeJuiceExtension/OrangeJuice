const SHORTCUTS_COMMENTS = [
	{ key: 'j / J', description: 'Move down / expands collapsed' },
	{ key: 'k / K', description: 'Move up / expands collapsed' },
	{ key: 'n', description: 'Go to next sibling comment' },
	{ key: 'p', description: 'Go to previous sibling comment' },
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
];

const SHORTCUTS_STORIES = [
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
	{ key: 'h', description: 'Toggle hide read stories' },
	{ key: 'esc', description: 'Unfocus story' },
];

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
];

const LOGO_PATH = '/assets/image-128.png';
const WEBSITE_URL = 'https://oj-hn.com';
const GITHUB_URL = 'https://github.com/OrangeJuiceExtension/OrangeJuice';

const getLogoUrl = () => {
	return `${WEBSITE_URL}${LOGO_PATH}`;
};

const createShortcutsTable = (
	doc: Document,
	shortcuts: { key: string; description: string }[]
): HTMLElement => {
	const table = doc.createElement('table');
	table.style.width = '100%';
	table.style.borderCollapse = 'collapse';

	const tbody = doc.createElement('tbody');

	for (const { key, description } of shortcuts) {
		const tr = doc.createElement('tr');

		const keyTd = doc.createElement('td');
		keyTd.style.padding = '3px 8px';
		keyTd.style.fontWeight = 'bold';
		keyTd.style.width = '30%';
		keyTd.style.whiteSpace = 'nowrap';
		keyTd.textContent = key;
		tr.appendChild(keyTd);

		const descTd = doc.createElement('td');
		descTd.style.padding = '3px 8px';
		descTd.textContent = description;
		tr.appendChild(descTd);

		tbody.appendChild(tr);
	}

	table.appendChild(tbody);
	return table;
};

export const getKeyboardShortcutsHelp = (doc: Document): HTMLElement => {
	const outerContainer = doc.createElement('div');

	// Top row - Branding left, navigation shortcuts right
	const topRow = doc.createElement('div');
	topRow.style.display = 'flex';
	topRow.style.gap = '32px';
	topRow.style.marginBottom = '24px';

	const brandColumn = doc.createElement('div');
	brandColumn.style.flex = '1';
	brandColumn.style.display = 'flex';
	brandColumn.style.flexDirection = 'column';
	brandColumn.style.alignItems = 'center';
	brandColumn.style.justifyContent = 'center';
	brandColumn.style.textAlign = 'center';

	const logo = doc.createElement('img');
	logo.src = getLogoUrl();
	logo.alt = 'Orange Juice logo';
	logo.style.width = '128px';
	logo.style.height = '128px';
	brandColumn.appendChild(logo);

	const linkContainer = doc.createElement('div');
	linkContainer.style.display = 'flex';
	linkContainer.style.gap = '12px';

	const siteLink = doc.createElement('a');
	siteLink.href = WEBSITE_URL;
	siteLink.textContent = 'Website';
	siteLink.rel = 'noreferrer';
	siteLink.target = '_blank';

	const githubLink = doc.createElement('a');
	githubLink.href = GITHUB_URL;
	githubLink.textContent = 'GitHub';
	githubLink.rel = 'noreferrer';
	githubLink.target = '_blank';

	linkContainer.appendChild(siteLink);
	linkContainer.appendChild(githubLink);
	brandColumn.appendChild(linkContainer);

	const navColumn = doc.createElement('div');
	navColumn.style.flex = '1';

	const commonHeading = doc.createElement('h2');
	commonHeading.style.marginTop = '0';
	commonHeading.style.marginBottom = '0';
	commonHeading.style.color = '#000';
	commonHeading.style.paddingBottom = '8px';
	commonHeading.style.borderBottom = '1px solid #ff6600';
	commonHeading.textContent = 'Navigation shortcuts';
	navColumn.appendChild(commonHeading);

	const commonNote = doc.createElement('div');
	commonNote.style.fontSize = '0.85em';
	commonNote.style.color = '#666';
	commonNote.style.marginTop = '8px';
	commonNote.style.marginBottom = '6px';
	commonNote.textContent = '(requires Alt / Option ⌥)';
	navColumn.appendChild(commonNote);

	navColumn.appendChild(createShortcutsTable(doc, SHORTCUTS_COMMON));

	topRow.appendChild(brandColumn);
	topRow.appendChild(navColumn);
	outerContainer.appendChild(topRow);

	// Bottom row - Comments and Stories
	const bottomRow = doc.createElement('div');
	bottomRow.style.display = 'flex';
	bottomRow.style.gap = '32px';

	// Left column - Stories shortcuts
	const leftColumn = doc.createElement('div');
	leftColumn.style.flex = '1';

	const storiesHeading = doc.createElement('h2');
	storiesHeading.style.marginTop = '0';
	storiesHeading.style.marginBottom = '8px';
	storiesHeading.style.color = '#000';
	storiesHeading.style.paddingBottom = '8px';
	storiesHeading.style.borderBottom = '1px solid #ff6600';
	storiesHeading.textContent = 'Stories shortcuts';
	leftColumn.appendChild(storiesHeading);

	leftColumn.appendChild(createShortcutsTable(doc, SHORTCUTS_STORIES));
	bottomRow.appendChild(leftColumn);

	// Right column - Comments shortcuts
	const rightColumn = doc.createElement('div');
	rightColumn.style.flex = '1';

	const commentsHeading = doc.createElement('h2');
	commentsHeading.style.marginTop = '0';
	commentsHeading.style.marginBottom = '8px';
	commentsHeading.style.color = '#000';
	commentsHeading.style.paddingBottom = '8px';
	commentsHeading.style.borderBottom = '1px solid #ff6600';
	commentsHeading.textContent = 'Comments shortcuts';
	rightColumn.appendChild(commentsHeading);

	rightColumn.appendChild(createShortcutsTable(doc, SHORTCUTS_COMMENTS));
	bottomRow.appendChild(rightColumn);

	outerContainer.appendChild(bottomRow);

	return outerContainer;
};
