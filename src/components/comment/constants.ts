export const OJ_NEW_COMMENT_INDENT = 'oj_new_comment_indent';
export const OJ_NEW_CLICKABLE_INDENT = 'oj_new_clickable_indent';

export const createCommentRow = (doc: Document, id: number, options?: { collapsed?: boolean }) => {
	const row = doc.createElement('tr');
	row.id = `comment-${id}`;
	row.classList.add('comtr');
	row.classList.add('athing');
	if (options?.collapsed) {
		row.classList.add('coll');
	}
	doc.body.appendChild(row);
	return row;
};

export const addIndentation = (doc: Document, row: HTMLElement, level: number) => {
	const indentCell = doc.createElement('td');
	indentCell.className = 'ind';
	const indentImage = doc.createElement('img');
	indentImage.width = level * 40;
	indentImage.dataset.indentLevel = `${level}`;
	indentCell.appendChild(indentImage);
	row.appendChild(indentCell);
};
