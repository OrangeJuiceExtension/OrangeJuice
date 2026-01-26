const backtickRegex = /`([\s\S]*?)`/g;

export const backticksToCode = (_doc: Document, comments: Element[]): void => {
	for (const comment of comments) {
		const commentSpan = comment.querySelector('.commtext');
		if (!commentSpan) {
			continue;
		}

		const monospacedHtml = commentSpan.innerHTML.replace(backtickRegex, '<code>$1</code>');
		commentSpan.innerHTML = monospacedHtml;
	}
};
