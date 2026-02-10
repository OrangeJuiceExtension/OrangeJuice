import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	ensureMermaidStyles,
	extractMermaidCodesFromText,
	MERMAID_RENDERED_CLASS,
	normalizeCodeWrappedMermaidBlocks,
	renderMermaidCode,
	renderMermaidInElement,
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

	describe('extractMermaidCodesFromText', () => {
		const testCases = [
			{
				name: 'extracts one block',
				input: '<mermaid>graph TD\nA --> B</mermaid>',
				want: ['graph TD\nA --> B'],
			},
			{
				name: 'extracts multiple blocks and decodes escapes',
				input: '<mermaid>flowchart TD\\nA --> B</mermaid> x <mermaid>graph LR\\nC --> D</mermaid>',
				want: ['flowchart TD\nA --> B', 'graph LR\nC --> D'],
			},
			{ name: 'returns empty when no blocks', input: 'nothing here', want: [] },
		] as const;

		for (const { name, input, want } of testCases) {
			it(name, () => {
				expect(extractMermaidCodesFromText(input)).toEqual(want);
			});
		}
	});

	describe('renderMermaidCode', () => {
		it('uses light theme by default', async () => {
			renderMermaidMock.mockResolvedValue('<svg id="light"></svg>');

			const svg = await renderMermaidCode('graph TD\nA --> B', document);

			expect(svg).toContain('light');
			expect(renderMermaidMock).toHaveBeenCalledWith(
				'graph TD\nA --> B',
				expect.objectContaining({ bg: '#ffffff' })
			);
		});

		it('uses dark theme when dark mode is active', async () => {
			document.documentElement.classList.add('oj-dark-mode');
			renderMermaidMock.mockResolvedValue('<svg id="dark"></svg>');

			const svg = await renderMermaidCode('graph TD\nA --> B', document);

			expect(svg).toContain('dark');
			expect(renderMermaidMock).toHaveBeenCalledWith(
				'graph TD\nA --> B',
				expect.objectContaining({ bg: '#0d1117' })
			);
		});
	});

	describe('ensureMermaidStyles', () => {
		it('injects shared mermaid styles once', () => {
			ensureMermaidStyles(document);
			ensureMermaidStyles(document);

			const styles = document.querySelectorAll('style#oj-mermaid-style');
			expect(styles).toHaveLength(1);
			expect(styles[0]?.textContent).toContain(`.${MERMAID_RENDERED_CLASS}`);
		});
	});

	describe('rerenderMermaidBlocksInElement', () => {
		it('rerenders already rendered blocks with current theme', async () => {
			const container = document.createElement('div');
			container.innerHTML = `<div class="${MERMAID_RENDERED_CLASS}" data-oj-mermaid-code="graph TD\nA --> B"><svg id="old"></svg></div>`;
			renderMermaidMock.mockResolvedValue('<svg id="updated"></svg>');

			await rerenderMermaidBlocksInElement(container, document);

			expect(container.querySelector('#updated')).toBeTruthy();
			expect(renderMermaidMock).toHaveBeenCalledWith(
				'graph TD\nA --> B',
				expect.objectContaining({ bg: '#ffffff' })
			);
		});
	});

	describe('renderMermaidInElement', () => {
		it('replaces only mermaid elements and preserves sibling html', async () => {
			const container = document.createElement('div');
			container.innerHTML =
				'<strong>before</strong><mermaid>graph TD\nA --> B</mermaid><em>after</em>';
			renderMermaidMock.mockResolvedValue('<svg id="in-place"></svg>');

			const changed = await renderMermaidInElement(container, document);

			expect(changed).toBe(true);
			expect(container.querySelector('strong')?.textContent).toBe('before');
			expect(container.querySelector('em')?.textContent).toBe('after');
			expect(container.querySelector(`.${MERMAID_RENDERED_CLASS}`)).toBeTruthy();
			expect(container.querySelector('#in-place')).toBeTruthy();
		});

		it('removes pre/code wrappers for mermaid elements', async () => {
			const container = document.createElement('div');
			container.innerHTML = '<pre><code><mermaid>graph TD\nA --> B</mermaid></code></pre>';
			renderMermaidMock.mockResolvedValue('<svg id="wrapped-node"></svg>');

			const changed = await renderMermaidInElement(container, document);

			expect(changed).toBe(true);
			expect(container.querySelector('pre')).toBeNull();
			expect(container.querySelector('code')).toBeNull();
			expect(container.querySelector('#wrapped-node')).toBeTruthy();
		});

		it('keeps code wrapper when it contains non-mermaid content', async () => {
			const container = document.createElement('div');
			container.innerHTML = '<code>prefix <mermaid>graph TD\nA --> B</mermaid> suffix</code>';
			renderMermaidMock.mockResolvedValue('<svg id="inline-mermaid"></svg>');

			const changed = await renderMermaidInElement(container, document);

			expect(changed).toBe(true);
			const code = container.querySelector('code');
			expect(code).toBeTruthy();
			expect(code?.textContent).toContain('prefix');
			expect(code?.textContent).toContain('suffix');
			expect(container.querySelector('#inline-mermaid')).toBeTruthy();
		});

		it('does not render text-only mermaid tags', async () => {
			const container = document.createElement('div');
			const pre = document.createElement('pre');
			const code = document.createElement('code');
			code.textContent = '<mermaid>graph TD\\nA --> B</mermaid>';
			pre.appendChild(code);
			container.appendChild(pre);
			renderMermaidMock.mockResolvedValue('<svg id="wrapped-text"></svg>');

			const changed = await renderMermaidInElement(container, document);

			expect(changed).toBe(false);
			expect(container.querySelector('pre')).toBeTruthy();
			expect(container.querySelector('code')).toBeTruthy();
			expect(container.querySelector(`.${MERMAID_RENDERED_CLASS}`)).toBeNull();
		});

		it('returns false when no mermaid is present', async () => {
			const container = document.createElement('div');
			container.innerHTML = '<p>plain text</p>';

			const changed = await renderMermaidInElement(container, document);

			expect(changed).toBe(false);
			expect(renderMermaidMock).not.toHaveBeenCalled();
		});
	});

	describe('normalizeCodeWrappedMermaidBlocks', () => {
		it('parses code text to mermaid nodes and renders them', async () => {
			const container = document.createElement('div');
			container.innerHTML =
				'<pre><code>&lt;mermaid&gt;\\nflowchart TD\\nA --&gt; B\\n&lt;/mermaid&gt;</code></pre>';
			renderMermaidMock.mockResolvedValue('<svg id="normalized-code-mermaid"></svg>');

			await normalizeCodeWrappedMermaidBlocks(container);

			expect(container.querySelector('#normalized-code-mermaid')).toBeTruthy();
			expect(container.querySelector('pre')).toBeNull();
			expect(container.querySelector('code')).toBeNull();
		});
	});
});
