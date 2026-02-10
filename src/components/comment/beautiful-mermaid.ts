import type { ContentScriptContext } from '#imports';
import {
	ensureMermaidStyles,
	extractMermaidCodesFromText,
	normalizeCodeWrappedMermaidBlocks,
	renderMermaidCode,
	renderMermaidInElement,
	rerenderMermaidBlocksInElement,
} from '@/utils/mermaid.ts';

const BM_PREVIEW_CLASS = 'oj-comment-bm-preview';
const BM_PREVIEW_STYLE_ID = 'oj-comment-bm-preview-style';
const COMMENT_TEXTAREA_SELECTOR = 'textarea[name="text"]';

const ensureStyles = (doc: Document): void => {
	if (doc.getElementById(BM_PREVIEW_STYLE_ID)) {
		return;
	}
	const style = doc.createElement('style');
	style.id = BM_PREVIEW_STYLE_ID;
	style.textContent = `
		.${BM_PREVIEW_CLASS} {
			display: block;
			vertical-align: top;
			margin: 10px 0px 5px 0px;
			overflow: auto;
		}

		.${BM_PREVIEW_CLASS} svg {
			max-width: 100%;
			height: auto;
		}

		@media (max-width: 900px) {
			.${BM_PREVIEW_CLASS} {
				display: block;
				max-width: 100%;
				margin: 10px 0 0;
			}
		}
	`;
	doc.head.appendChild(style);
};

const renderCommentBlocks = async (comments: HTMLElement[]): Promise<void> => {
	for (const comment of comments) {
		const commtext = comment.querySelector<HTMLElement>('.commtext');
		if (!commtext) {
			continue;
		}
		await normalizeCodeWrappedMermaidBlocks(commtext);
		const hasMermaidElement = commtext.querySelector('mermaid') !== null;
		if (!hasMermaidElement) {
			continue;
		}
		await renderMermaidInElement(commtext, commtext.ownerDocument);
	}
};

const ensurePreviewElement = (textarea: HTMLTextAreaElement): HTMLDivElement => {
	const existing = textarea.parentElement?.querySelector<HTMLDivElement>(`.${BM_PREVIEW_CLASS}`);
	if (existing) {
		return existing;
	}
	const preview = textarea.ownerDocument.createElement('div');
	preview.className = BM_PREVIEW_CLASS;
	textarea.insertAdjacentElement('afterend', preview);
	return preview;
};

const setupTextareaPreview = (
	textarea: HTMLTextAreaElement,
	cleanupCallbacks: Array<() => void>,
	previewRerenderCallbacks: Array<() => void>
): void => {
	const preview = ensurePreviewElement(textarea);
	let latestRunId = 0;

	const updatePreview = async (): Promise<void> => {
		const bmCodes = extractMermaidCodesFromText(textarea.value);
		if (bmCodes.length === 0) {
			preview.replaceChildren();
			return;
		}

		const runId = latestRunId + 1;
		latestRunId = runId;
		try {
			const svgs: string[] = [];
			for (const bmCode of bmCodes) {
				const svg = await renderMermaidCode(bmCode, textarea.ownerDocument);
				svgs.push(svg);
			}
			if (runId !== latestRunId) {
				return;
			}
			preview.innerHTML = svgs.join('');
		} catch (error) {
			if (runId !== latestRunId) {
				return;
			}
			console.error('Failed to render beautiful-mermaid preview:', error);
			preview.textContent = 'Could not render beautiful-mermaid diagram.';
		}
	};

	const triggerUpdate = (): void => {
		updatePreview().catch((error: unknown) => {
			console.error('Failed to update beautiful-mermaid preview:', error);
		});
	};

	textarea.addEventListener('input', triggerUpdate);
	cleanupCallbacks.push(() => {
		textarea.removeEventListener('input', triggerUpdate);
	});
	previewRerenderCallbacks.push(triggerUpdate);
	triggerUpdate();
};

export const commentBeautifulMermaid = async (
	ctx: ContentScriptContext,
	doc: Document,
	comments: HTMLElement[]
): Promise<void> => {
	const path = window.location.pathname;

	const allowedPrefixes = ['/item', '/edit', '/threads', '/newcomments'];
	if (!allowedPrefixes.some((prefix) => path.startsWith(prefix))) {
		return;
	}

	ensureMermaidStyles(doc);
	ensureStyles(doc);
	await renderCommentBlocks(comments);

	const cleanupCallbacks: Array<() => void> = [];
	const previewRerenderCallbacks: Array<() => void> = [];
	const seenTextareas = new WeakSet<HTMLTextAreaElement>();

	const attachTextarea = (textarea: HTMLTextAreaElement): void => {
		if (seenTextareas.has(textarea)) {
			return;
		}
		seenTextareas.add(textarea);
		setupTextareaPreview(textarea, cleanupCallbacks, previewRerenderCallbacks);
	};

	const attachTextareasInContainer = (container: ParentNode): void => {
		for (const textarea of Array.from(
			container.querySelectorAll<HTMLTextAreaElement>(COMMENT_TEXTAREA_SELECTOR)
		)) {
			attachTextarea(textarea);
		}
	};

	const attachTextareasFromAddedNode = (addedNode: Node): void => {
		if (!(addedNode instanceof HTMLElement)) {
			return;
		}
		if (addedNode instanceof HTMLTextAreaElement && addedNode.name === 'text') {
			attachTextarea(addedNode);
			return;
		}
		attachTextareasInContainer(addedNode);
	};

	attachTextareasInContainer(doc);

	const observer = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			for (const addedNode of mutation.addedNodes) {
				attachTextareasFromAddedNode(addedNode);
			}
		}
	});
	observer.observe(doc.body, { childList: true, subtree: true });

	const themeObserver = new MutationObserver(() => {
		rerenderMermaidBlocksInElement(doc, doc).catch((error: unknown) => {
			console.error('Failed to rerender mermaid blocks after theme change:', error);
		});
		for (const rerender of previewRerenderCallbacks) {
			rerender();
		}
	});
	themeObserver.observe(doc.documentElement, {
		attributes: true,
		attributeFilter: ['class'],
	});

	ctx.onInvalidated(() => {
		observer.disconnect();
		themeObserver.disconnect();
		for (const cleanup of cleanupCallbacks) {
			cleanup();
		}
	});
};
