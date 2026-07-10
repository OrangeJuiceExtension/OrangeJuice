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

const decodeEscapes = (value: string): string =>
	value
		.replace(ESCAPED_NEWLINE_PATTERN, '\n')
		.replace(ESCAPED_TAB_PATTERN, '\t')
		.replace(ESCAPED_QUOTE_PATTERN, '"');

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
	if (!result) {
		return;
	}

	const parsed = new DOMParser().parseFromString(result, 'text/html');
	const svgRoot = parsed.querySelector('svg');
	if (!svgRoot) {
		return;
	}

	const svg = doc.importNode(svgRoot, true) as SVGElement;
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

	const renderedBlocks = await Promise.all(
		preCodeNodes.map(async (preCodeNode) => {
			const pre = preCodeNode.parentElement;
			if (!pre) {
				return;
			}

			const mermaids = extractMermaidFromText(preCodeNode.innerText);
			if (mermaids.length === 0) {
				return;
			}

			const svgNodes = (
				await Promise.all(
					mermaids.map((mermaid) => createMermaidSvgNodeFromMarkup(mermaid, doc))
				)
			).filter((svgNode): svgNode is SVGElement => Boolean(svgNode));
			return { pre, svgNodes };
		})
	);

	for (const renderedBlock of renderedBlocks) {
		if (!(renderedBlock && renderedBlock.svgNodes.length > 0)) {
			continue;
		}
		const { pre, svgNodes } = renderedBlock;
		let insertionAnchor: Element = pre;
		for (const svgNode of svgNodes) {
			insertionAnchor.insertAdjacentElement('afterend', svgNode);
			insertionAnchor = svgNode;
			results.push(svgNode);
		}
		pre.remove();
	}

	return results;
};

export const rerenderMermaidBlocksInElement = async (
	container: ParentNode,
	doc: Document
): Promise<SVGElement[]> => {
	const blocks = container.querySelectorAll<HTMLElement>(`.${MERMAID_SVG_CLASS}`);
	const results = await Promise.all(
		[...blocks].map(async (block): Promise<SVGElement | undefined> => {
			const mermaid = block.getAttribute(MERMAID_CODE_ATTRIBUTE);
			if (!mermaid) {
				return;
			}
			try {
				const svg = await createMermaidSvgNodeFromMarkup(mermaid, doc);
				if (svg) {
					block.replaceWith(svg);
					return svg;
				}
			} catch (error) {
				console.error('Failed to rerender mermaid block:', error);
			}
		})
	);
	return results.filter((svg): svg is SVGElement => Boolean(svg));
};
