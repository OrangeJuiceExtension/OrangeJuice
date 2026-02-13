import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContentScriptContext } from '#imports';
import { commentBeautifulMermaid } from '@/components/comment/beautiful-mermaid.ts';

const renderMermaidMock = vi.fn();

vi.mock('beautiful-mermaid', () => ({
	renderMermaid: (code: string, options?: unknown) => renderMermaidMock(code, options),
	THEMES: {
		'github-light': { bg: '#ffffff', fg: '#111111' },
		'github-dark': { bg: '#0d1117', fg: '#e6edf3' },
	},
}));

const flush = async (): Promise<void> => {
	await new Promise((resolve) => setTimeout(resolve, 0));
};

interface TestCtx {
	ctx: ContentScriptContext;
	invalidate: () => void;
}

const createCtx = (): TestCtx => {
	const callbacks: Array<() => void> = [];
	return {
		ctx: {
			onInvalidated: (callback: () => void) => {
				callbacks.push(callback);
			},
		} as ContentScriptContext,
		invalidate: () => {
			for (const callback of callbacks) {
				callback();
			}
		},
	};
};

interface MockComment {
	commentRow: HTMLElement;
}

const createCommentRow = (codeText: string): HTMLElement => {
	const row = document.createElement('tr');
	const commtext = document.createElement('span');
	commtext.className = 'commtext';
	const pre = document.createElement('pre');
	const code = document.createElement('code');
	code.innerText = codeText;
	pre.appendChild(code);
	commtext.appendChild(pre);
	row.appendChild(commtext);
	return row;
};

const createComment = (codeText: string): MockComment => ({
	commentRow: createCommentRow(codeText),
});

describe('commentBeautifulMermaid', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
		document.documentElement.classList.remove('oj-dark-mode');
		renderMermaidMock.mockReset();
		window.history.pushState({}, '', '/news');
	});

	describe('path gating', () => {
		it('does nothing on unsupported paths', async () => {
			const comment = createComment('<mermaid>graph TD\\nA --> B</mermaid>');
			const { ctx } = createCtx();

			await commentBeautifulMermaid(ctx, document, [comment as never]);
			await flush();

			expect(renderMermaidMock).not.toHaveBeenCalled();
			expect(document.getElementById('oj-mermaid-style')).toBeNull();
			expect(document.querySelector('.oj-comment-mermaid-preview')).toBeNull();
		});

		it('runs on allowed paths', async () => {
			window.history.pushState({}, '', '/item?id=1');
			const comment = createComment('<mermaid>graph TD\\nA --> B</mermaid>');
			renderMermaidMock.mockResolvedValue('<svg id="saved-mermaid"></svg>');
			const { ctx, invalidate } = createCtx();

			await commentBeautifulMermaid(ctx, document, [comment as never]);
			await flush();

			expect(renderMermaidMock).toHaveBeenCalledWith(
				'graph TD\nA --> B',
				expect.objectContaining({ bg: '#ffffff' })
			);
			expect(comment.commentRow.querySelector('#saved-mermaid')).toBeTruthy();
			invalidate();
		});
	});

	describe('comment rendering', () => {
		it('removes pre/code wrappers after render', async () => {
			window.history.pushState({}, '', '/item?id=1');
			const comment = createComment('<mermaid>graph TD\\nA --> B</mermaid>');
			renderMermaidMock.mockResolvedValue('<svg id="wrapped-mermaid"></svg>');
			const { ctx, invalidate } = createCtx();

			await commentBeautifulMermaid(ctx, document, [comment as never]);
			await flush();

			const commtext = comment.commentRow.querySelector<HTMLElement>('.commtext');
			expect(commtext?.querySelector('pre')).toBeNull();
			expect(commtext?.querySelector('code')).toBeNull();
			expect(commtext?.querySelector('#wrapped-mermaid')).toBeTruthy();
			invalidate();
		});

		it('leaves non-mermaid blocks unchanged', async () => {
			window.history.pushState({}, '', '/item?id=1');
			const comment = createComment('plain code');
			const { ctx, invalidate } = createCtx();

			await commentBeautifulMermaid(ctx, document, [comment as never]);
			await flush();

			expect(renderMermaidMock).not.toHaveBeenCalled();
			const commtext = comment.commentRow.querySelector<HTMLElement>('.commtext');
			expect(commtext?.querySelector('pre')).toBeTruthy();
			expect(commtext?.querySelector('code')).toBeTruthy();
			invalidate();
		});
	});

	describe('preview', () => {
		it('renders preview for existing textarea and updates on input', async () => {
			window.history.pushState({}, '', '/item?id=1');
			const textarea = document.createElement('textarea');
			textarea.name = 'text';
			textarea.value = '<mermaid>graph TD\\nA --> B</mermaid>';
			document.body.appendChild(textarea);
			renderMermaidMock.mockImplementation((code: string) => {
				return Promise.resolve(`<svg data-code="${code}"></svg>`);
			});
			const { ctx, invalidate } = createCtx();

			await commentBeautifulMermaid(ctx, document, []);
			await flush();

			let preview = document.querySelector<HTMLDivElement>('.oj-comment-mermaid-preview');
			expect(preview?.querySelector('svg')).toBeTruthy();

			textarea.value = '<mermaid>graph TD\\nX --> Y</mermaid>';
			textarea.dispatchEvent(new Event('input'));
			await flush();

			preview = document.querySelector<HTMLDivElement>('.oj-comment-mermaid-preview');
			expect(preview?.innerHTML).toContain('X --> Y');
			invalidate();
		});

		it('attaches preview to dynamically added textarea', async () => {
			window.history.pushState({}, '', '/item?id=1');
			renderMermaidMock.mockResolvedValue('<svg id="dynamic-preview"></svg>');
			const { ctx, invalidate } = createCtx();

			await commentBeautifulMermaid(ctx, document, []);

			const form = document.createElement('form');
			const textarea = document.createElement('textarea');
			textarea.name = 'text';
			textarea.value = '<mermaid>graph TD\\nC --> D</mermaid>';
			form.appendChild(textarea);
			document.body.appendChild(form);
			await flush();

			const preview = document.querySelector<HTMLDivElement>('.oj-comment-mermaid-preview');
			expect(preview?.querySelector('#dynamic-preview')).toBeTruthy();
			invalidate();
		});

		it('shows preview error state when rendering throws', async () => {
			window.history.pushState({}, '', '/item?id=1');
			const textarea = document.createElement('textarea');
			textarea.name = 'text';
			textarea.value = '<mermaid>graph TD\\nA --> B</mermaid>';
			document.body.appendChild(textarea);
			renderMermaidMock.mockRejectedValue(new Error('render failed'));
			const { ctx, invalidate } = createCtx();
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			await commentBeautifulMermaid(ctx, document, []);
			await flush();

			const preview = document.querySelector<HTMLDivElement>('.oj-comment-mermaid-preview');
			expect(preview?.classList.contains('oj-comment-mermaid-preview-error')).toBe(true);
			expect(preview?.textContent).toContain('Could not render Mermaid diagram.');
			expect(consoleErrorSpy).toHaveBeenCalled();
			consoleErrorSpy.mockRestore();
			invalidate();
		});
	});

	describe('theme rerender', () => {
		it('rerenders comment blocks when theme class changes', async () => {
			window.history.pushState({}, '', '/item?id=1');
			const comment = createComment('<mermaid>graph TD\\nA --> B</mermaid>');
			document.body.appendChild(comment.commentRow);
			renderMermaidMock.mockResolvedValue('<svg id="theme-svg"></svg>');
			const { ctx, invalidate } = createCtx();

			await commentBeautifulMermaid(ctx, document, [comment as never]);
			await flush();

			const initialCalls = renderMermaidMock.mock.calls.length;
			document.documentElement.classList.add('oj-dark-mode');
			await flush();

			expect(renderMermaidMock.mock.calls.length).toBeGreaterThan(initialCalls);
			expect(renderMermaidMock).toHaveBeenLastCalledWith(
				'graph TD\nA --> B',
				expect.objectContaining({ bg: '#0d1117' })
			);
			invalidate();
		});

		it('rerenders preview when theme class changes', async () => {
			window.history.pushState({}, '', '/item?id=1');
			const textarea = document.createElement('textarea');
			textarea.name = 'text';
			textarea.value = '<mermaid>graph TD\\nA --> B</mermaid>';
			document.body.appendChild(textarea);
			renderMermaidMock.mockResolvedValue('<svg id="preview-theme"></svg>');
			const { ctx, invalidate } = createCtx();

			await commentBeautifulMermaid(ctx, document, []);
			await flush();

			const initialCalls = renderMermaidMock.mock.calls.length;
			document.documentElement.classList.add('oj-dark-mode');
			await flush();

			expect(renderMermaidMock.mock.calls.length).toBeGreaterThan(initialCalls);
			expect(renderMermaidMock).toHaveBeenLastCalledWith(
				'graph TD\nA --> B',
				expect.objectContaining({ bg: '#0d1117' })
			);
			invalidate();
		});
	});
});
