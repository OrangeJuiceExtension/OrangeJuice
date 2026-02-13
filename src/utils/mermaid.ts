import { renderMermaid, THEMES } from 'beautiful-mermaid';

export const MERMAID = 'mermaid';
const MERMAID_OPEN_TAG = `<${MERMAID}>`;
const MERMAID_CLOSE_TAG = `</${MERMAID}>`;
const ESCAPED_NEWLINE_PATTERN = /\\n/g;
const ESCAPED_TAB_PATTERN = /\\t/g;
const ESCAPED_QUOTE_PATTERN = /\\"/g;
const MERMAID_STYLE_ID = `oj-${MERMAID}-style`;
const MERMAID_SVG_CLASS = `oj-${MERMAID}-svg`;
const MERMAID_SVG_CLICK_BOUND_ATTRIBUTE = `data-oj-${MERMAID}-click-bound`;

const LIGHT_THEME_NAME = 'github-light';
const DARK_THEME_NAME = 'github-dark';

export const MERMAID_CODE_ATTRIBUTE = `data-oj-${MERMAID}-code`;

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
		.${MERMAID_SVG_CLASS} {
			display: block;
			width: auto !important;
			height: auto !important;
			max-width: 100% !important;
		}
	`;
	doc.head.appendChild(style);
};

export const extractMermaidFromText = (text: string): string[] => {
	const lower = text.toLowerCase();
	const mermaids: string[] = [];
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
			mermaids.push(code);
		}
		cursor = end + MERMAID_CLOSE_TAG.length;
	}
	return mermaids;
};

export const createMermaidSvgNodeFromMarkup = async (
	mermaid: string,
	doc: Document
): Promise<SVGElement | undefined> => {
	const result = await renderMermaid(mermaid, getRenderTheme(doc));

	const container = doc.createElement('div');
	container.innerHTML = result;

	const svg = container.firstElementChild as SVGElement | null;
	if (svg) {
		svg.setAttribute(MERMAID_CODE_ATTRIBUTE, mermaid);
		svg.classList.add(MERMAID_SVG_CLASS);

		// dumb, but prevents HN code from throwing an exception
		// we're also not going to bother with cleanup. it is too much of a hassle to track.
		const clickHandler = (event: MouseEvent) => {
			event.stopPropagation();
			event.stopImmediatePropagation();
		};

		svg.addEventListener('click', clickHandler);
		svg.setAttribute(MERMAID_SVG_CLICK_BOUND_ATTRIBUTE, '1');
		return svg;
	}
};

export const renderMermaidsInPreCodeElements = async (
	element: HTMLElement
): Promise<SVGElement[]> => {
	const doc = element.ownerDocument;
	const preCodeNodes = Array.from(element.querySelectorAll<HTMLElement>('pre > code'));
	const results: SVGElement[] = [];

	for (const preCodeNode of preCodeNodes) {
		const pre = preCodeNode.parentElement;
		if (!pre) {
			continue;
		}

		const mermaids = extractMermaidFromText(preCodeNode.innerText);
		if (mermaids.length === 0) {
			continue;
		}

		let insertionAnchor: Element = pre;
		let renderedCount = 0;
		for (const mermaid of mermaids) {
			const svgNode = await createMermaidSvgNodeFromMarkup(mermaid, doc);
			if (svgNode) {
				insertionAnchor.insertAdjacentElement('afterend', svgNode);
				insertionAnchor = svgNode;
				renderedCount += 1;
				results.push(svgNode);
			}
		}
		if (renderedCount > 0) {
			pre.remove();
		}
	}

	return results;
};

export const rerenderMermaidBlocksInElement = async (
	container: ParentNode,
	doc: Document
): Promise<SVGElement[]> => {
	const blocks = container.querySelectorAll<HTMLElement>(`.${MERMAID_SVG_CLASS}`);
	const results: SVGElement[] = [];

	for (const block of blocks) {
		const mermaid = block.getAttribute(MERMAID_CODE_ATTRIBUTE);
		if (!mermaid) {
			continue;
		}
		try {
			const svg = await createMermaidSvgNodeFromMarkup(mermaid, doc);
			if (svg) {
				block.replaceWith(svg);
				results.push(svg);
			}
		} catch (error) {
			console.error('Failed to rerender mermaid block:', error);
		}
	}
	return results;
};
