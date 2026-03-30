import { dom } from '@/utils/dom.ts';
import { OJ_NEW_COMMENT_INDENT } from './constants.ts';

// TODO: make this configurable in a popup menu
const customWidth = 40;

export const createGuidelinesNote = (options?: { marginBottom?: string }): HTMLDivElement => {
	const guidelinesNote = document.createElement('div');
	guidelinesNote.style.marginTop = '4px';
	guidelinesNote.style.fontSize = '8px';
	if (options?.marginBottom) {
		guidelinesNote.style.marginBottom = options.marginBottom;
	}

	const commentsLink = document.createElement('a');
	commentsLink.href = 'newswelcome.html';
	commentsLink.target = '_blank';
	commentsLink.rel = 'noopener noreferrer';
	const commentsUnderline = document.createElement('u');
	commentsUnderline.textContent = 'comments';
	commentsLink.append(commentsUnderline);

	const guidelinesLink = document.createElement('a');
	guidelinesLink.href = 'newsguidelines.html#comments';
	guidelinesLink.target = '_blank';
	guidelinesLink.rel = 'noopener noreferrer';
	const guidelinesUnderline = document.createElement('u');
	guidelinesUnderline.textContent = 'guidelines';
	guidelinesLink.append(guidelinesUnderline);

	guidelinesNote.append("HN's approach to ", commentsLink, ' and site ', guidelinesLink, '.');
	return guidelinesNote;
};

export const initCommentUX = (doc: Document, comments: HTMLElement[], username?: string): void => {
	const style = doc.createElement('style');
	style.textContent = `
		.oj_comment_indent {
			box-shadow: inset -1px 0 #ccc;
		}
		.oj_op {
			color: #ff6000 !important;
		}
		.${OJ_NEW_COMMENT_INDENT} {
			box-shadow: inset -2px 0 #ff6000;
		}
		.comment .commtext pre {
			background: #e4e4e4;
			border-radius: 6px;
			padding: 5px 5px 5px 0px;
		}
		.comment .commtext *:not(pre) code {
			background: #e4e4e4;
			border-radius: 6px;
			padding: 5px 5px 5px 5px;
			display: inline-block;
		}
	`;
	doc.head.appendChild(style);
	insertGuidelinesNote(doc);

	for (const comment of comments) {
		comment.querySelector('td.ind')?.classList.add('oj_comment_indent');

		// Custom indent width
		const { element: indentImage, width: indentLevel } = dom.getCommentIndentation(comment);
		if (indentImage && indentLevel !== undefined) {
			const indentLevel = indentImage.width / 40;
			indentImage.width = indentLevel * customWidth;
			indentImage.dataset.indentLevel = `${indentLevel}`;
		}

		const commentAuthor = comment.querySelector<HTMLAnchorElement>('a.hnuser');
		if (!commentAuthor) {
			continue;
		}

		// Highlight-op-username
		if (username && username === commentAuthor.innerText) {
			commentAuthor.innerText += ' [op]';
			commentAuthor.classList.add('oj_op');
		}
	}
};

const insertGuidelinesNote = (doc: Document): void => {
	const form = doc.querySelector<HTMLFormElement>('form[action="comment"][method="post"]');
	if (!form) {
		return;
	}

	const textarea = form.querySelector<HTMLTextAreaElement>('textarea[name="text"]');
	const submit = form.querySelector<HTMLInputElement>(
		'input[type="submit"][value="add comment"]'
	);
	if (!(textarea && submit)) {
		return;
	}

	let node = textarea.nextSibling;
	while (node && node !== submit) {
		const next = node.nextSibling;
		node.remove();
		node = next;
	}

	form.insertBefore(createGuidelinesNote({ marginBottom: '8px' }), submit);
};
