import createDOMPurify from 'dompurify';
import { find } from 'linkifyjs';

const LINKIFY_SKIP_TAGS = new Set(['A', 'CODE', 'PRE', 'SCRIPT', 'STYLE', 'TEXTAREA']);
const UNSAFE_URL_PROTOCOL_REGEX = /^\s*javascript:/i;

interface LinkifyDomOptions {
	openInNewTab?: boolean;
}

const getPurifier = (doc: Document) => {
	const view = doc.defaultView ?? window;
	return createDOMPurify(view);
};

const getNodeFilter = (doc: Document): typeof NodeFilter => {
	return doc.defaultView?.NodeFilter ?? NodeFilter;
};

const scrubUnsafeAttributes = (root: ParentNode, doc: Document): void => {
	const walker = doc.createTreeWalker(root, getNodeFilter(doc).SHOW_ELEMENT);

	let currentNode: Node | null = walker.currentNode;
	while (currentNode) {
		if (currentNode instanceof Element) {
			for (const attribute of Array.from(currentNode.attributes)) {
				const attributeName = attribute.name.toLowerCase();
				if (attributeName.startsWith('on')) {
					currentNode.removeAttribute(attribute.name);
					continue;
				}

				const attributeValue = attribute.value;
				if (
					(attributeName === 'href' || attributeName === 'src') &&
					UNSAFE_URL_PROTOCOL_REGEX.test(attributeValue)
				) {
					currentNode.removeAttribute(attribute.name);
				}
			}
		}
		currentNode = walker.nextNode();
	}
};

const createLinkifiedFragment = (
	doc: Document,
	text: string,
	options: LinkifyDomOptions = {}
): DocumentFragment | undefined => {
	const matches = find(text).filter((match) => match.isLink);
	if (matches.length === 0) {
		return undefined;
	}

	const fragment = doc.createDocumentFragment();
	let cursor = 0;

	for (const match of matches) {
		if (match.start > cursor) {
			fragment.append(text.slice(cursor, match.start));
		}

		const link = doc.createElement('a');
		link.href = match.href;
		link.textContent = match.value;
		if (options.openInNewTab) {
			link.target = '_blank';
			link.rel = 'noopener noreferrer';
		}
		fragment.append(link);
		cursor = match.end;
	}

	if (cursor < text.length) {
		fragment.append(text.slice(cursor));
	}

	return fragment;
};

export const createSanitizedFragment = (doc: Document, html: string): DocumentFragment => {
	const fragment = getPurifier(doc).sanitize(html, {
		RETURN_DOM_FRAGMENT: true,
		USE_PROFILES: {
			html: true,
		},
	}) as DocumentFragment;
	scrubUnsafeAttributes(fragment, doc);
	return fragment;
};

export const replaceChildrenWithSanitizedHtml = (
	element: Element,
	html: string
): DocumentFragment => {
	const fragment = createSanitizedFragment(element.ownerDocument, html);
	element.replaceChildren(fragment);
	return fragment;
};

export const cloneChildNodesInto = (source: Element, target: Element): void => {
	const fragment = target.ownerDocument.createDocumentFragment();

	for (const child of source.childNodes) {
		fragment.append(child.cloneNode(true));
	}

	target.replaceChildren(fragment);
};

export const linkifyTextNodes = (root: ParentNode, options: LinkifyDomOptions = {}): void => {
	const doc =
		root instanceof Document
			? root
			: (root.ownerDocument ?? document.implementation.createHTMLDocument());
	const textNodes: Text[] = [];
	const walker = doc.createTreeWalker(root, getNodeFilter(doc).SHOW_TEXT);

	let currentNode = walker.nextNode();
	while (currentNode) {
		const textNode = currentNode as Text;
		const parentTag = textNode.parentElement?.tagName;
		if (parentTag && LINKIFY_SKIP_TAGS.has(parentTag)) {
			currentNode = walker.nextNode();
			continue;
		}
		if (textNode.textContent?.trim()) {
			textNodes.push(textNode);
		}
		currentNode = walker.nextNode();
	}

	for (const textNode of textNodes) {
		const content = textNode.textContent ?? '';
		const fragment = createLinkifiedFragment(doc, content, options);
		if (fragment) {
			textNode.replaceWith(fragment);
		}
	}
};
