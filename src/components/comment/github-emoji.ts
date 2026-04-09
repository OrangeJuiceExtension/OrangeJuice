import { find } from 'node-emoji';

const SHORTCODE_REGEX = /:([a-z0-9_+-]+):/gi;
const SKIP_TAGS = new Set(['CODE', 'PRE']);

const replaceEmojiInTextNode = (doc: Document, textNode: Text): void => {
	const sourceText = textNode.textContent ?? '';
	SHORTCODE_REGEX.lastIndex = 0;

	let matched = false;
	let lastIndex = 0;
	const fragment = doc.createDocumentFragment();

	for (const match of sourceText.matchAll(SHORTCODE_REGEX)) {
		const shortcode = match[1]?.toLowerCase();
		if (!shortcode) {
			continue;
		}

		const matchResult = find(shortcode);
		if (!matchResult) {
			continue;
		}

		matched = true;
		const matchIndex = match.index ?? 0;
		fragment.append(sourceText.slice(lastIndex, matchIndex));
		fragment.append(matchResult.emoji);
		lastIndex = matchIndex + match[0].length;
	}

	if (!matched) {
		return;
	}

	fragment.append(sourceText.slice(lastIndex));
	textNode.replaceWith(fragment);
};

export const githubEmoji = (_doc: Document, comments: HTMLElement[]): void => {
	for (const comment of comments) {
		const commentSpan = comment.querySelector<HTMLElement>('.commtext');
		if (!commentSpan) {
			continue;
		}

		const doc = commentSpan.ownerDocument;
		const textNodes: Text[] = [];
		const walker = doc.createTreeWalker(commentSpan, NodeFilter.SHOW_TEXT);

		let currentNode = walker.nextNode();
		while (currentNode) {
			const parentTag = currentNode.parentElement?.tagName;
			if (!(parentTag && SKIP_TAGS.has(parentTag))) {
				textNodes.push(currentNode as Text);
			}
			currentNode = walker.nextNode();
		}

		for (const textNode of textNodes) {
			replaceEmojiInTextNode(doc, textNode);
		}
	}
};
