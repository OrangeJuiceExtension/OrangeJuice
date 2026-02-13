import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	createMermaidSvgNodeFromMarkup,
	ensureMermaidStyles,
	extractMermaidFromText,
	MERMAID_CODE_ATTRIBUTE,
	renderMermaidsInPreCodeElements,
	rerenderMermaidBlocksInElement,
} from '@/utils/mermaid.ts';

const renderMermaidMock = vi.fn();

vi.mock('beautiful-mermaid', () => ({
	renderMermaid: (code: string, options?: unknown) => renderMermaidMock(code, options),
	THEMES: {
		'github-light': { bg: '#ffffff', fg: '#111111' },
		'github-dark': { bg: '#0d1117', fg: '#e6edf3' },
	},
}));

describe('mermaid utils', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
		document.documentElement.classList.remove('oj-dark-mode');
		renderMermaidMock.mockReset();
	});

	describe('extractMermaidFromText', () => {
		const testCases = [
			{
				name: 'extracts one block',
				input: '<mermaid>graph TD\nA --> B</mermaid>',
				want: ['graph TD\nA --> B'],
			},
			{
				name: 'extracts multiple blocks and decodes escapes',
				input: '<MERMAID>flowchart TD\\nA --> B</MERMAID> x <mermaid>graph LR\\tC --\\"edge\\"--> D</mermaid>',
				want: ['flowchart TD\nA --> B', 'graph LR\tC --"edge"--> D'],
			},
			{
				name: 'returns empty when closing tag is missing',
				input: '<mermaid>graph TD\nA --> B',
				want: [],
			},
			{
				name: 'returns empty when content is blank after trim',
				input: '<mermaid>   </mermaid>',
				want: [],
			},
		] as const;

		for (const { name, input, want } of testCases) {
			it(name, () => {
				expect(extractMermaidFromText(input)).toEqual(want);
			});
		}
	});

	describe('ensureMermaidStyles', () => {
		it('injects mermaid styles once', () => {
			ensureMermaidStyles(document);
			ensureMermaidStyles(document);

			const styles = document.querySelectorAll('style#oj-mermaid-style');
			expect(styles).toHaveLength(1);
			expect(styles[0]?.textContent).toContain('.oj-mermaid-svg');
		});
	});

	describe('createMermaidSvgNodeFromMarkup', () => {
		it('uses light theme and decorates the rendered svg', async () => {
			renderMermaidMock.mockResolvedValue('<svg id="light"></svg>');

			const svg = await createMermaidSvgNodeFromMarkup('graph TD\nA --> B', document);

			expect(svg?.id).toBe('light');
			expect(svg?.classList.contains('oj-mermaid-svg')).toBe(true);
			expect(svg?.getAttribute(MERMAID_CODE_ATTRIBUTE)).toBe('graph TD\nA --> B');
			expect(svg?.getAttribute('data-oj-mermaid-click-bound')).toBe('1');
			expect(renderMermaidMock).toHaveBeenCalledWith(
				'graph TD\nA --> B',
				expect.objectContaining({ bg: '#ffffff' })
			);
		});

		it('uses dark theme when dark mode is active', async () => {
			document.documentElement.classList.add('oj-dark-mode');
			renderMermaidMock.mockResolvedValue('<svg id="dark"></svg>');

			const svg = await createMermaidSvgNodeFromMarkup('graph TD\nA --> B', document);

			expect(svg?.id).toBe('dark');
			expect(renderMermaidMock).toHaveBeenCalledWith(
				'graph TD\nA --> B',
				expect.objectContaining({ bg: '#0d1117' })
			);
		});

		it('returns undefined when rendered markup has no root element', async () => {
			renderMermaidMock.mockResolvedValue('');

			const svg = await createMermaidSvgNodeFromMarkup('graph TD\nA --> B', document);

			expect(svg).toBeUndefined();
		});
	});

	describe('renderMermaidsInPreCodeElements', () => {
		it('renders mermaid blocks from pre > code and removes wrappers', async () => {
			const container = document.createElement('div');
			const pre = document.createElement('pre');
			const code = document.createElement('code');
			code.innerText = '<mermaid>graph TD\\nA --> B</mermaid>';
			pre.appendChild(code);
			container.appendChild(pre);
			renderMermaidMock.mockResolvedValue('<svg id="single-mermaid"></svg>');

			const rendered = await renderMermaidsInPreCodeElements(container);

			expect(rendered).toHaveLength(1);
			expect(rendered[0]?.id).toBe('single-mermaid');
			expect(container.querySelector('pre')).toBeNull();
			expect(container.querySelector('code')).toBeNull();
			expect(container.querySelector('#single-mermaid')).toBeTruthy();
		});

		it('renders multiple mermaid blocks in order', async () => {
			const container = document.createElement('div');
			const pre = document.createElement('pre');
			const code = document.createElement('code');
			code.innerText =
				'<mermaid>graph TD\\nA --> B</mermaid><mermaid>graph TD\\nB --> C</mermaid>';
			pre.appendChild(code);
			container.appendChild(pre);
			renderMermaidMock.mockImplementation((code: string) => {
				if (code.includes('A --> B')) {
					return '<svg id="first"></svg>';
				}
				return '<svg id="second"></svg>';
			});

			const rendered = await renderMermaidsInPreCodeElements(container);

			expect(rendered).toHaveLength(2);
			expect(rendered[0]?.id).toBe('first');
			expect(rendered[1]?.id).toBe('second');
			const svgIds = Array.from(
				container.querySelectorAll<SVGElement>('.oj-mermaid-svg')
			).map((svg) => svg.id);
			expect(svgIds).toEqual(['first', 'second']);
		});

		it('keeps pre/code when no mermaid tag is present', async () => {
			const container = document.createElement('div');
			container.innerHTML = '<pre><code>plain text</code></pre>';

			const rendered = await renderMermaidsInPreCodeElements(container);

			expect(rendered).toHaveLength(0);
			expect(container.querySelector('pre')).toBeTruthy();
			expect(container.querySelector('code')).toBeTruthy();
			expect(renderMermaidMock).not.toHaveBeenCalled();
		});

		it('keeps pre/code when all renders return no svg node', async () => {
			const container = document.createElement('div');
			const pre = document.createElement('pre');
			const code = document.createElement('code');
			code.innerText = '<mermaid>graph TD\\nA --> B</mermaid>';
			pre.appendChild(code);
			container.appendChild(pre);
			renderMermaidMock.mockResolvedValue('');

			const rendered = await renderMermaidsInPreCodeElements(container);

			expect(rendered).toHaveLength(0);
			expect(container.querySelector('pre')).toBeTruthy();
			expect(container.querySelector('code')).toBeTruthy();
		});
	});

	describe('rerenderMermaidBlocksInElement', () => {
		it('rerenders all mermaid svg blocks with stored code', async () => {
			const container = document.createElement('div');
			container.innerHTML = `
				<svg class="oj-mermaid-svg" ${MERMAID_CODE_ATTRIBUTE}="graph TD
A --> B" id="old-1"></svg>
				<svg class="oj-mermaid-svg" ${MERMAID_CODE_ATTRIBUTE}="graph TD
B --> C" id="old-2"></svg>
			`;
			renderMermaidMock.mockImplementation((code: string) => {
				if (code.includes('A --> B')) {
					return '<svg id="new-1"></svg>';
				}
				return '<svg id="new-2"></svg>';
			});

			const rendered = await rerenderMermaidBlocksInElement(container, document);

			expect(rendered).toHaveLength(2);
			expect(container.querySelector('#old-1')).toBeNull();
			expect(container.querySelector('#old-2')).toBeNull();
			expect(container.querySelector('#new-1')).toBeTruthy();
			expect(container.querySelector('#new-2')).toBeTruthy();
		});

		it('skips blocks without stored mermaid code', async () => {
			const container = document.createElement('div');
			container.innerHTML = '<svg class="oj-mermaid-svg" id="no-code"></svg>';

			const rendered = await rerenderMermaidBlocksInElement(container, document);

			expect(rendered).toHaveLength(0);
			expect(container.querySelector('#no-code')).toBeTruthy();
			expect(renderMermaidMock).not.toHaveBeenCalled();
		});

		it('continues rerendering other blocks after one render fails', async () => {
			const container = document.createElement('div');
			container.innerHTML = `
				<svg class="oj-mermaid-svg" ${MERMAID_CODE_ATTRIBUTE}="graph TD
A --> B" id="old-1"></svg>
				<svg class="oj-mermaid-svg" ${MERMAID_CODE_ATTRIBUTE}="graph TD
B --> C" id="old-2"></svg>
			`;
			renderMermaidMock
				.mockRejectedValueOnce(new Error('boom'))
				.mockResolvedValueOnce('<svg id="new-2"></svg>');
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			const rendered = await rerenderMermaidBlocksInElement(container, document);

			expect(rendered).toHaveLength(1);
			expect(container.querySelector('#old-1')).toBeTruthy();
			expect(container.querySelector('#new-2')).toBeTruthy();
			expect(consoleErrorSpy).toHaveBeenCalledTimes(1);

			consoleErrorSpy.mockRestore();
		});
	});
});
