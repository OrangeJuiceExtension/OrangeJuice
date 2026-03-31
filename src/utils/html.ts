import type { Properties, Root, RootContent } from 'hast';
import { fromHtml } from 'hast-util-from-html';
import { defaultSchema, type Schema, sanitize } from 'hast-util-sanitize';
import { find } from 'linkifyjs';
import { find as findProperty, html as htmlPropertyInfo, type Info } from 'property-information';

const LINKIFY_SKIP_TAGS = new Set(['A', 'CODE', 'PRE', 'SCRIPT', 'STYLE', 'TEXTAREA']);
const SANITIZE_SCHEMA: Schema = {
	...defaultSchema,
	attributes: {
		...defaultSchema.attributes,
		a: [...(defaultSchema.attributes?.a ?? []), 'rel', 'target', 'title'],
	},
	strip: [...(defaultSchema.strip ?? []), 'embed', 'iframe', 'object', 'style', 'template'],
};

interface LinkifyDomOptions {
	openInNewTab?: boolean;
}

const getNodeFilter = (doc: Document): typeof NodeFilter => {
	return doc.defaultView?.NodeFilter ?? NodeFilter;
};

const propertyValueToAttributeValue = (info: Info, value: Properties[string]): string => {
	if (Array.isArray(value)) {
		if (info.commaSeparated) {
			return value.map(String).join(',');
		}

		return value.map(String).join(' ');
	}

	if (info.boolean && value === true) {
		return '';
	}

	return String(value);
};

const setSanitizedProperty = (
	element: Element,
	propertyName: string,
	value: Properties[string]
): void => {
	if (value === null || value === undefined || value === false) {
		return;
	}

	const info = findProperty(htmlPropertyInfo, propertyName);
	if (info.mustUseProperty) {
		Reflect.set(element, info.property, value);
		return;
	}

	const attributeValue = propertyValueToAttributeValue(info, value);
	element.setAttribute(info.attribute, attributeValue);
};

const createDomNodeFromHast = (doc: Document, node: RootContent): Node | undefined => {
	if (node.type === 'text') {
		return doc.createTextNode(node.value);
	}

	if (node.type === 'comment') {
		return doc.createComment(node.value);
	}

	if (node.type !== 'element') {
		return undefined;
	}

	const element = doc.createElement(node.tagName);
	for (const [propertyName, value] of Object.entries(node.properties)) {
		setSanitizedProperty(element, propertyName, value);
	}

	for (const child of node.children) {
		const domChild = createDomNodeFromHast(doc, child);
		if (domChild) {
			element.append(domChild);
		}
	}

	return element;
};

const createSanitizedRoot = (html: string): Root => {
	const tree = fromHtml(html, { fragment: true });
	return sanitize(tree, SANITIZE_SCHEMA) as Root;
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
	const fragment = doc.createDocumentFragment();
	const sanitizedRoot = createSanitizedRoot(html);

	for (const child of sanitizedRoot.children) {
		const sanitizedChild = createDomNodeFromHast(doc, child);
		if (sanitizedChild) {
			fragment.append(sanitizedChild);
		}
	}

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
