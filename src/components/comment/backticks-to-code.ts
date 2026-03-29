const backtickRegex = /(?<!\\)`([\s\S]*?)(?<!\\)`/g;

const replaceBackticksInTextNode = (doc: Document, textNode: Text): void => {
	const sourceText = textNode.textContent ?? '';
	backtickRegex.lastIndex = 0;

	let matched = false;
	let lastIndex = 0;
	const fragment = doc.createDocumentFragment();

	for (const match of sourceText.matchAll(backtickRegex)) {
		matched = true;
		const matchIndex = match.index ?? 0;
		fragment.append(sourceText.slice(lastIndex, matchIndex));

		const code = doc.createElement('code');
		code.textContent = match[1] ?? '';
		fragment.append(code);

		lastIndex = matchIndex + match[0].length;
	}

	if (!matched) {
		return;
	}

	fragment.append(sourceText.slice(lastIndex));
	textNode.replaceWith(fragment);
};

export const backticksToCode = (_doc: Document, comments: HTMLElement[]): void => {
	for (const comment of comments) {
		const commentSpan = comment.querySelector('.commtext');
		if (!commentSpan) {
			continue;
		}

		const doc = commentSpan.ownerDocument;
		const textNodes: Text[] = [];
		const walker = doc.createTreeWalker(commentSpan, NodeFilter.SHOW_TEXT);

		let currentNode = walker.nextNode();
		while (currentNode) {
			const parentElement = currentNode.parentElement;
			if (parentElement?.tagName !== 'CODE') {
				textNodes.push(currentNode as Text);
			}
			currentNode = walker.nextNode();
		}

		for (const textNode of textNodes) {
			replaceBackticksInTextNode(doc, textNode);
		}
	}
};
