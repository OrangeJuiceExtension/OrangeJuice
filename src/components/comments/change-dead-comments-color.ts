export const changeDeadCommentsColor = (doc: Document, comments: Element[]): void => {
	const style = doc.createElement('style');
	style.textContent = `
		.oj_dead_comment {
			color: #d89899 !important;
		}
	`;
	doc.head.appendChild(style);

	for (const comment of comments) {
		const commentHeadSpan = comment.querySelector<HTMLSpanElement>('span.comhead');
		if (commentHeadSpan?.innerText.includes('[dead]')) {
			comment
				.querySelector('div.comment span.commtext.cdd')
				?.classList.add('oj_dead_comment');
		}
	}
};
