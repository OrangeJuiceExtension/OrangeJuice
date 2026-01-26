export const indentToggle = (doc: Document, comments: HTMLElement[]): void => {
	const style = doc.createElement('style');
	style.textContent = `
		.oj_clickable_indent {
			cursor: pointer;
		}
		
		.oj_clickable_indent:hover {
			box-shadow: inset -2px 0 #888;
		}
	`;
	doc.head.appendChild(style);

	for (const comment of comments) {
		const indentCell = comment.querySelector('td.ind');
		const toggleBtn = comment.querySelector<HTMLAnchorElement>('a.togg');

		if (indentCell && toggleBtn) {
			indentCell.classList.add('oj_clickable_indent');
			indentCell.addEventListener('click', () => {
				toggleBtn.click();
			});
		}
	}
};
