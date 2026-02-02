const SHORTCUTS_COMMENTS = [
	{ key: 'j', description: 'Move down to next comment' },
	{ key: 'J', description: 'Next comment, including collapsed' },
	{ key: 'k', description: 'Move up to previous comment' },
	{ key: 'K', description: 'Previous comment, including collapsed' },
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
	{ key: 'esc', description: 'Unfocus comment or close reply box' },
	{ key: '?', description: 'Show this help dialog' },
];

const SHORTCUTS_COMMON = [
	{ key: 'H', description: 'Home' },
	{ key: 'S', description: 'Submit' },
	{ key: 'O', description: 'Show' },
	{ key: 'A', description: 'Ask' },
	{ key: 'N', description: 'New' },
	{ key: 'P', description: 'Profile' },
	{ key: 'T', description: 'Threads' },
];

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
		keyTd.textContent = key;
		tr.appendChild(keyTd);

		const descTd = doc.createElement('td');
		descTd.style.padding = '3px 8px';
		descTd.style.whiteSpace = 'nowrap';
		descTd.textContent = description;
		tr.appendChild(descTd);

		tbody.appendChild(tr);
	}

	table.appendChild(tbody);
	return table;
};

export const getKeyboardShortcutsHelp = (doc: Document): HTMLElement => {
	const container = doc.createElement('div');
	container.style.display = 'flex';
	container.style.gap = '32px';

	// Left column - Comments shortcuts
	const leftColumn = doc.createElement('div');
	leftColumn.style.flex = '1';

	const heading = doc.createElement('h2');
	heading.style.marginTop = '0';
	heading.style.marginBottom = '8px';
	heading.style.color = '#000';
	heading.style.paddingBottom = '8px';
	heading.style.borderBottom = '1px solid #ff6600';
	heading.textContent = 'Comments shortcuts';
	leftColumn.appendChild(heading);

	leftColumn.appendChild(createShortcutsTable(doc, SHORTCUTS_COMMENTS));
	container.appendChild(leftColumn);

	// Right column - Navigation shortcuts
	const rightColumn = doc.createElement('div');
	rightColumn.style.flex = '0 0 auto';

	const commonHeading = doc.createElement('h2');
	commonHeading.style.marginTop = '0';
	commonHeading.style.marginBottom = '0';
	commonHeading.style.color = '#000';
	commonHeading.style.paddingBottom = '8px';
	commonHeading.style.borderBottom = '1px solid #ff6600';
	commonHeading.textContent = 'Navigation shortcuts';
	rightColumn.appendChild(commonHeading);

	const commonNote = doc.createElement('div');
	commonNote.style.fontSize = '0.85em';
	commonNote.style.color = '#666';
	commonNote.style.marginTop = '8px';
	commonNote.style.marginBottom = '6px';
	commonNote.textContent = '(requires Alt / Option ⌥)';
	rightColumn.appendChild(commonNote);

	rightColumn.appendChild(createShortcutsTable(doc, SHORTCUTS_COMMON));
	container.appendChild(rightColumn);

	return container;
};
