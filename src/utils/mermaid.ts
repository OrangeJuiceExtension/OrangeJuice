import { renderMermaid, THEMES } from 'beautiful-mermaid';

const MERMAID_OPEN_TAG = '<mermaid>';
const MERMAID_CLOSE_TAG = '</mermaid>';
const ESCAPED_NEWLINE_PATTERN = /\\n/g;
const ESCAPED_TAB_PATTERN = /\\t/g;
const ESCAPED_QUOTE_PATTERN = /\\"/g;
const LIGHT_THEME_NAME = 'github-light';
const DARK_THEME_NAME = 'github-dark';
const MERMAID_STYLE_ID = 'oj-mermaid-style';

export const MERMAID_RENDERED_CLASS = 'oj-mermaid-rendered';
export const MERMAID_CODE_ATTRIBUTE = 'data-oj-mermaid-code';

const decodeEscapes = (value: string): string => {
	return value
		.replace(ESCAPED_NEWLINE_PATTERN, '\n')
		.replace(ESCAPED_TAB_PATTERN, '\t')
		.replace(ESCAPED_QUOTE_PATTERN, '"');
};

const getRenderTheme = (doc: Document) => {
	const isDarkMode = doc.documentElement.classList.contains('oj-dark-mode');
	return isDarkMode ? THEMES[DARK_THEME_NAME] : THEMES[LIGHT_THEME_NAME];
};

export const ensureMermaidStyles = (doc: Document): void => {
	if (doc.getElementById(MERMAID_STYLE_ID)) {
		return;
	}
	const style = doc.createElement('style');
	style.id = MERMAID_STYLE_ID;
	style.textContent = `
		.${MERMAID_RENDERED_CLASS} {
			margin: 10px 0;
			overflow: auto;
		}

		.${MERMAID_RENDERED_CLASS} svg {
			display: block;
			max-width: 100%;
			height: auto;
		}
	`;
	doc.head.appendChild(style);
};

const createMermaidBlock = async (code: string, doc: Document): Promise<HTMLDivElement | null> => {
	const normalizedCode = decodeEscapes(code).trim();
	if (!normalizedCode) {
		return null;
	}
	const block = doc.createElement('div');
	block.className = MERMAID_RENDERED_CLASS;
	block.setAttribute(MERMAID_CODE_ATTRIBUTE, normalizedCode);
	try {
		block.innerHTML = await renderMermaidCode(normalizedCode, doc);
		return block;
	} catch (error) {
		console.error('Failed to render beautiful-mermaid block:', error);
		return null;
	}
};

const isWhitespaceTextNode = (node: Node): boolean => {
	return node.nodeType === Node.TEXT_NODE && (node.textContent?.trim() ?? '') === '';
};

const hasOnlyMermaidContent = (container: HTMLElement, mermaidNode: HTMLElement): boolean => {
	for (const child of Array.from(container.childNodes)) {
		if (child === mermaidNode || isWhitespaceTextNode(child)) {
			continue;
		}
		return false;
	}
	return true;
};

const getMermaidReplacementTarget = (mermaidNode: HTMLElement): HTMLElement => {
	let target: HTMLElement = mermaidNode;
	let parent = target.parentElement;
	while (parent) {
		const tagName = parent.tagName.toLowerCase();
		if (tagName !== 'pre' && tagName !== 'code') {
			break;
		}
		if (!hasOnlyMermaidContent(parent, target)) {
			break;
		}
		target = parent;
		parent = target.parentElement;
	}
	return target;
};

const renderFromHtmlMermaidTags = async (
	element: HTMLElement,
	doc: Document
): Promise<boolean | null> => {
	const mermaidNodes = Array.from(element.querySelectorAll<HTMLElement>('mermaid'));
	if (mermaidNodes.length === 0) {
		return null;
	}

	let renderedCount = 0;
	for (const mermaidNode of mermaidNodes) {
		if (mermaidNode.parentNode === null) {
			continue;
		}
		const block = await createMermaidBlock(mermaidNode.textContent ?? '', doc);
		if (!block) {
			continue;
		}
		const replacementTarget = getMermaidReplacementTarget(mermaidNode);
		replacementTarget.replaceWith(block);
		renderedCount += 1;
	}
	return renderedCount > 0;
};

export const extractMermaidCodesFromText = (text: string): string[] => {
	const lower = text.toLowerCase();
	const codes: string[] = [];
	let cursor = 0;
	while (cursor < text.length) {
		const start = lower.indexOf(MERMAID_OPEN_TAG, cursor);
		if (start === -1) {
			break;
		}
		const contentStart = start + MERMAID_OPEN_TAG.length;
		const end = lower.indexOf(MERMAID_CLOSE_TAG, contentStart);
		if (end === -1) {
			break;
		}
		const code = decodeEscapes(text.slice(contentStart, end)).trim();
		if (code) {
			codes.push(code);
		}
		cursor = end + MERMAID_CLOSE_TAG.length;
	}
	return codes;
};

export const renderMermaidCode = (code: string, doc: Document): Promise<string> => {
	return renderMermaid(code, getRenderTheme(doc));
};

export const rerenderMermaidBlocksInElement = async (
	container: ParentNode,
	doc: Document
): Promise<void> => {
	for (const block of Array.from(
		container.querySelectorAll<HTMLElement>(`.${MERMAID_RENDERED_CLASS}`)
	)) {
		const code = block.getAttribute(MERMAID_CODE_ATTRIBUTE);
		if (!code) {
			continue;
		}
		try {
			const svg = await renderMermaidCode(code, doc);
			block.innerHTML = svg;
		} catch (error) {
			console.error('Failed to rerender mermaid block:', error);
		}
	}
};

export const renderMermaidInElement = async (
	element: HTMLElement,
	doc: Document
): Promise<boolean> => {
	const renderedFromHtml = await renderFromHtmlMermaidTags(element, doc);
	return renderedFromHtml ?? false;
};

export const normalizeCodeWrappedMermaidBlocks = async (container: HTMLElement): Promise<void> => {
	for (const codeBlock of Array.from(container.querySelectorAll<HTMLElement>('code'))) {
		if (codeBlock.querySelector('mermaid')) {
			continue;
		}
		const rawText = codeBlock.textContent ?? '';
		if (!(rawText.includes(MERMAID_OPEN_TAG) && rawText.includes(MERMAID_CLOSE_TAG))) {
			continue;
		}

		const parsedContainer = container.ownerDocument.createElement('div');
		parsedContainer.innerHTML = rawText;
		if (!parsedContainer.querySelector('mermaid')) {
			continue;
		}

		await renderMermaidInElement(parsedContainer, container.ownerDocument);
		codeBlock.replaceWith(parsedContainer);

		const maybePre = parsedContainer.parentElement;
		if (
			maybePre?.tagName.toLowerCase() === 'pre' &&
			maybePre.childElementCount === 1 &&
			maybePre.firstElementChild === parsedContainer
		) {
			maybePre.replaceWith(parsedContainer);
		}
	}
};
