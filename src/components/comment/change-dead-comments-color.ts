export const OJ_DEAD_COMMENT = 'oj_dead_comment';

export const changeDeadCommentsColor = (doc: Document, comments: HTMLElement[]): void => {
	const style = doc.createElement('style');
	style.textContent = `
		.${OJ_DEAD_COMMENT} {
			color: #d89899 !important;
		}

		/** if dead, then the text is so light, it doesn't show up in the code blocks */
		.cDD code {
			color: dimgrey;
		}
	`;
	doc.head.appendChild(style);

	for (const comment of comments) {
		const commentHeadSpan = comment.querySelector<HTMLSpanElement>('span.comhead');
		if (commentHeadSpan?.innerText.includes('[dead]')) {
			comment.querySelector('div.comment span.commtext.cdd')?.classList.add(OJ_DEAD_COMMENT);
		}
	}
};
