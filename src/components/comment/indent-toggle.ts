import type { ContentScriptContext } from '#imports';

export const indentToggle = (
	ctx: ContentScriptContext,
	doc: Document,
	comments: HTMLElement[]
): void => {
	const style = doc.createElement('style');

	// .ind over 3px makes room for the top level comment to have a wider box-shadow
	style.textContent = `
		.ind {
			padding-left: 3px;
		}

		.oj_clickable_indent {
			cursor: pointer;
		}
		
		.oj_clickable_indent:hover {
			box-shadow: inset -3px 0 #888;
		}
		
		.col .oj_clickable_indent {
			box-shadow: inset -3px 0 #888;
		}
	`;
	doc.head.appendChild(style);

	const handlers: Array<{ element: HTMLElement; handler: () => void }> = [];

	for (const comment of comments) {
		const indentCell = comment.querySelector('td.ind') as HTMLTableCellElement;
		const toggleBtn = comment.querySelector<HTMLAnchorElement>('a.togg');

		if (indentCell && toggleBtn) {
			indentCell.classList.add('oj_clickable_indent');
			const handler = () => {
				toggleBtn.click();
			};
			indentCell.addEventListener('click', handler);
			handlers.push({ element: indentCell, handler });
		}
	}

	ctx.onInvalidated(() => {
		for (const { element, handler } of handlers) {
			element.removeEventListener('click', handler);
		}
	});
};
