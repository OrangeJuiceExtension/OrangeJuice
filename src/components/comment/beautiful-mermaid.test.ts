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

const createCtx = () => {
	const callbacks: Array<() => void> = [];
	return {
		ctx: {
			onInvalidated: (callback: () => void) => {
				callbacks.push(callback);
			},
		},
		invalidate: () => {
			for (const callback of callbacks) {
				callback();
			}
		},
	};
};

describe('commentBeautifulMermaid', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
		renderMermaidMock.mockReset();
		window.history.pushState({}, '', '/news');
	});

	it('does nothing outside /item paths', async () => {
		const comment = document.createElement('div');
		comment.className = 'comment';
		comment.innerHTML = `<span class="commtext">&lt;mermaid&gt;graph TD
A --&gt; B&lt;/mermaid&gt;</span>`;
		const { ctx } = createCtx();

		await commentBeautifulMermaid(ctx as unknown as ContentScriptContext, document, [comment]);
		await flush();

		expect(renderMermaidMock).not.toHaveBeenCalled();
		expect(comment.querySelector('.oj-comment-bm-rendered')).toBeNull();
	});

	it('renders bm blocks inside saved comments', async () => {
		window.history.pushState({}, '', '/item?id=1');
		const comment = document.createElement('div');
		comment.className = 'comment';
		const commtext = document.createElement('span');
		commtext.className = 'commtext';
		commtext.innerHTML = '<mermaid>graph TD\n  A --&gt; B</mermaid>';
		comment.appendChild(commtext);
		renderMermaidMock.mockResolvedValue('<svg id="saved-bm"></svg>');
		const { ctx, invalidate } = createCtx();

		await commentBeautifulMermaid(ctx as unknown as ContentScriptContext, document, [comment]);
		await flush();

		expect(renderMermaidMock).toHaveBeenCalledWith(
			'graph TD\n  A --> B',
			expect.objectContaining({ bg: '#ffffff' })
		);
		const nextCommtext = comment.querySelector('.commtext') as HTMLElement | null;
		expect(nextCommtext?.innerHTML).toContain('saved-bm');
		invalidate();
	});

	it('renders escaped newline mermaid content from saved comments', async () => {
		window.history.pushState({}, '', '/item?id=1');
		const comment = document.createElement('div');
		comment.className = 'comment';
		const commtext = document.createElement('span');
		commtext.className = 'commtext';
		commtext.innerHTML =
			'<mermaid>\\nflowchart TD\\n  A["Claim"] --&gt; B["Actor"]\\n  B --&gt; C["Outcome"]\\n</mermaid>';
		comment.appendChild(commtext);
		renderMermaidMock.mockResolvedValue('<svg id="escaped-bm"></svg>');
		const { ctx, invalidate } = createCtx();

		await commentBeautifulMermaid(ctx as unknown as ContentScriptContext, document, [comment]);
		await flush();

		expect(renderMermaidMock).toHaveBeenCalledWith(
			'flowchart TD\n  A["Claim"] --> B["Actor"]\n  B --> C["Outcome"]',
			expect.objectContaining({ bg: '#ffffff' })
		);
		const nextCommtext = comment.querySelector('.commtext') as HTMLElement | null;
		expect(nextCommtext?.innerHTML).toContain('escaped-bm');
		invalidate();
	});

	it('removes pre/code wrappers around mermaid blocks', async () => {
		window.history.pushState({}, '', '/item?id=1');
		const comment = document.createElement('div');
		comment.className = 'comment';
		const commtext = document.createElement('span');
		commtext.className = 'commtext';
		commtext.innerHTML = '<pre><code><mermaid>graph TD\nA --&gt; B</mermaid></code></pre>';
		comment.appendChild(commtext);
		renderMermaidMock.mockResolvedValue('<svg id="wrapped-bm"></svg>');
		const { ctx, invalidate } = createCtx();

		await commentBeautifulMermaid(ctx as unknown as ContentScriptContext, document, [comment]);
		await flush();

		const nextCommtext = comment.querySelector('.commtext') as HTMLElement | null;
		expect(nextCommtext?.querySelector('pre')).toBeNull();
		expect(nextCommtext?.querySelector('code')).toBeNull();
		expect(nextCommtext?.innerHTML).toContain('wrapped-bm');
		invalidate();
	});

	it('renders preview next to reply textarea and updates on input', async () => {
		window.history.pushState({}, '', '/item?id=1');
		const textarea = document.createElement('textarea');
		textarea.name = 'text';
		textarea.value = '<mermaid>\ngraph TD\n  A --> B\n</mermaid>';
		document.body.appendChild(textarea);

		renderMermaidMock.mockImplementation(
			(code: string) => Promise.resolve(`<svg data-code="${code}"></svg>`) as Promise<string>
		);
		const { ctx, invalidate } = createCtx();

		await commentBeautifulMermaid(ctx as unknown as ContentScriptContext, document, []);
		await flush();

		let preview = document.querySelector('.oj-comment-bm-preview') as HTMLDivElement | null;
		expect(preview?.innerHTML.length).toBeGreaterThan(0);

		textarea.value = '<mermaid>\ngraph TD\n  X --> Y\n</mermaid>';
		textarea.dispatchEvent(new Event('input'));
		await flush();

		preview = document.querySelector('.oj-comment-bm-preview') as HTMLDivElement | null;
		expect(preview?.innerHTML.length).toBeGreaterThan(0);
		expect(renderMermaidMock).toHaveBeenLastCalledWith(
			'graph TD\n  X --> Y',
			expect.objectContaining({ bg: '#ffffff' })
		);

		invalidate();
	});

	it('attaches preview for dynamically inserted reply textarea', async () => {
		window.history.pushState({}, '', '/item?id=1');
		const { ctx, invalidate } = createCtx();

		renderMermaidMock.mockResolvedValue('<svg id="dynamic-preview"></svg>');
		await commentBeautifulMermaid(ctx as unknown as ContentScriptContext, document, []);

		const form = document.createElement('form');
		const textarea = document.createElement('textarea');
		textarea.name = 'text';
		textarea.value = '<mermaid>\ngraph TD\n  C --> D\n</mermaid>';
		form.appendChild(textarea);
		document.body.appendChild(form);
		await flush();

		const preview = document.querySelector('.oj-comment-bm-preview') as HTMLDivElement | null;
		expect(preview?.innerHTML).toContain('dynamic-preview');
		invalidate();
	});

	it('uses dark theme when dark mode is active', async () => {
		window.history.pushState({}, '', '/item?id=1');
		const comment = document.createElement('div');
		comment.className = 'comment';
		const commtext = document.createElement('span');
		commtext.className = 'commtext';
		commtext.innerHTML = '<mermaid>graph TD\n  A --&gt; B</mermaid>';
		comment.appendChild(commtext);
		const { ctx, invalidate } = createCtx();
		renderMermaidMock.mockResolvedValue('<svg id="theme-test"></svg>');

		document.documentElement.classList.add('oj-dark-mode');
		await commentBeautifulMermaid(ctx as unknown as ContentScriptContext, document, [comment]);
		await flush();

		expect(renderMermaidMock).toHaveBeenCalledWith(
			'graph TD\n  A --> B',
			expect.objectContaining({ bg: '#0d1117' })
		);
		invalidate();
	});

	it('preserves links and sibling markup around mermaid blocks', async () => {
		window.history.pushState({}, '', '/item?id=1');
		const comment = document.createElement('div');
		comment.className = 'comment';
		const commtext = document.createElement('span');
		commtext.className = 'commtext';
		commtext.innerHTML =
			'Visit <a href="https://example.com">example</a> <strong>now</strong> <mermaid>graph TD\nA --&gt; B</mermaid> done.';
		comment.appendChild(commtext);
		renderMermaidMock.mockResolvedValue('<svg id="mixed-content-mermaid"></svg>');
		const { ctx, invalidate } = createCtx();

		await commentBeautifulMermaid(ctx as unknown as ContentScriptContext, document, [comment]);
		await flush();

		const nextCommtext = comment.querySelector('.commtext') as HTMLElement | null;
		const link = nextCommtext?.querySelector('a[href="https://example.com"]');
		expect(link).toBeTruthy();
		expect(link?.textContent).toBe('example');
		expect(nextCommtext?.querySelector('strong')?.textContent).toBe('now');
		expect(nextCommtext?.querySelector('#mixed-content-mermaid')).toBeTruthy();
		expect(nextCommtext?.textContent).toContain('Visit');
		expect(nextCommtext?.textContent).toContain('done.');
		invalidate();
	});
});
