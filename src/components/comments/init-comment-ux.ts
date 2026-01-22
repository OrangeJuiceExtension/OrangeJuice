import { dom } from '@/utils/dom.ts';

// TODO: make this configurable in a popup menu
const customWidth = 40;

export const initCommentUX = (doc: Document, comments: Element[]): void => {
	const style = doc.createElement('style');
	style.textContent = `
		.oj_comment_indent {
			box-shadow: inset -1px 0 #ccc
		}
		.oj_op {
			color: #ff6000 !important
		}
		.oj_new_comment_indent {
			box-shadow: inset -2px 0 #ff6000
		}
		.comment .commtext pre {
			background: #e4e4e4;
			border-radius: 6px;
			padding: 5px 5px 5px 0px;
		}
		.comment .commtext *:not(pre) code {
			background: #e4e4e4;
			border-radius: 6px;
			padding: 5px 5px 5px 0px;
			display: inline-block;
		}
	`;
	doc.head.appendChild(style);

	for (const comment of comments) {
		comment.querySelector('td.ind')?.classList.add('oj_comment_indent');

		// Custom indent width
		const indentImage = comment.querySelector<HTMLImageElement>('td.ind img');
		if (indentImage) {
			const indentLevel = indentImage.width / 40;
			indentImage.width = indentLevel * customWidth;
			indentImage.dataset.indentLevel = `${indentLevel}`;
		}

		const commentAuthor = comment.querySelector<HTMLAnchorElement>('a.hnuser');
		if (!commentAuthor) {
			continue;
		}

		const itemAuthor = dom.getUsername(doc);

		// Highlight-op-username
		if (itemAuthor && itemAuthor === commentAuthor.innerText) {
			commentAuthor.innerText += ' [op]';
			commentAuthor.classList.add('oj_op');
		}
	}
};
