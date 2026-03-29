export const createSanitizedFragment = (doc: Document, html: string): DocumentFragment => {
	const fragment = doc.createDocumentFragment();
	const parsed = new DOMParser().parseFromString(html, 'text/html');

	for (const child of Array.from(parsed.body.childNodes)) {
		fragment.append(doc.importNode(child, true));
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
