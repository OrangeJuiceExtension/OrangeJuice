const SHORTCUTS = [
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
	{ key: 'Escape', description: 'Unfocus comment or close reply box' },
	{ key: '?', description: 'Show this help dialog' },
];

export const getKeyboardShortcutsHelp = (): HTMLElement => {
	const container = document.createElement('div');

	const heading = document.createElement('h2');
	heading.style.marginTop = '0';
	heading.style.color = '#000';
	heading.textContent = 'Comments keyboard shortcuts';
	container.appendChild(heading);

	const table = document.createElement('table');
	table.style.width = '100%';
	table.style.borderCollapse = 'collapse';

	const tbody = document.createElement('tbody');

	for (const { key, description } of SHORTCUTS) {
		const tr = document.createElement('tr');

		const keyTd = document.createElement('td');
		keyTd.style.padding = '8px';
		keyTd.style.fontWeight = 'bold';
		keyTd.style.width = '30%';
		keyTd.textContent = key;
		tr.appendChild(keyTd);

		const descTd = document.createElement('td');
		descTd.style.padding = '8px';
		descTd.style.whiteSpace = 'nowrap';
		descTd.textContent = description;
		tr.appendChild(descTd);

		tbody.appendChild(tr);
	}

	table.appendChild(tbody);
	container.appendChild(table);

	return container;
};
