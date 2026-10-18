import type { ContentScriptContext } from '#imports';
import type { HNComment } from '@/components/comment/hn-comment.ts';
import { getErrorMessage } from '@/utils/error.ts';
import {
	createMermaidSvgNodeFromMarkup,
	ensureMermaidStyles,
	extractMermaidFromText,
	MERMAID,
	renderMermaidsInPreCodeElements,
	rerenderMermaidBlocksInElement,
} from '@/utils/mermaid.ts';

const MERMAID_PREVIEW_CLASS = `oj-comment-${MERMAID}-preview`;
const MERMAID_PREVIEW_STYLE_ID = `oj-comment-${MERMAID}-preview-style`;
const COMMENT_TEXTAREA_SELECTOR = 'textarea[name="text"]';
const PREVIEW_DEBOUNCE_MS = 150;
const MERMAID_PREVIEW_ERROR_CLASS = `oj-comment-${MERMAID}-preview-error`;

const ensurePreviewStyles = (doc: Document): void => {
	if (doc.getElementById(MERMAID_PREVIEW_STYLE_ID)) {
		return;
	}
	const style = doc.createElement('style');
	style.id = MERMAID_PREVIEW_STYLE_ID;
	style.textContent = `
		.${MERMAID_PREVIEW_ERROR_CLASS} {
			color: red;
		}
	`;
	doc.head.appendChild(style);
};

const renderCommentBlocks = async (comments: HNComment[]): Promise<void> => {
	await Promise.all(
		comments.map(async (comment) => {
			const commtext = comment.commentRow.querySelector<HTMLElement>('.commtext');
			if (!commtext) {
				return;
			}
			await renderMermaidsInPreCodeElements(commtext);
		})
	);
};

const ensurePreviewElement = (textarea: HTMLTextAreaElement): HTMLDivElement => {
	const existing = textarea.parentElement?.querySelector<HTMLDivElement>(
		`.${MERMAID_PREVIEW_CLASS}`
	);
	if (existing) {
		return existing;
	}
	const preview = textarea.ownerDocument.createElement('div');
	preview.className = MERMAID_PREVIEW_CLASS;
	textarea.insertAdjacentElement('afterend', preview);
	return preview;
};

const setupTextareaPreview = (
	textarea: HTMLTextAreaElement,
	cleanupCallbacks: (() => void)[],
	previewRerenderCallbacks: (() => void)[]
): void => {
	const preview = ensurePreviewElement(textarea);
	let latestRunId = 0;
	let requestedKey: string | undefined;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let disposed = false;

	const renderPreview = async (mermaids: string[], runId: number): Promise<void> => {
		try {
			const svgNodes = (
				await Promise.all(
					mermaids.map((mermaid) =>
						createMermaidSvgNodeFromMarkup(mermaid, textarea.ownerDocument)
					)
				)
			).filter((node): node is SVGElement => Boolean(node));
			if (disposed || runId !== latestRunId) {
				return;
			}
			preview.classList.remove(MERMAID_PREVIEW_ERROR_CLASS);
			preview.replaceChildren(...svgNodes);
		} catch (error: unknown) {
			if (disposed || runId !== latestRunId) {
				return;
			}
			console.error('Failed to render Mermaid preview:', error);
			preview.textContent = `Could not render Mermaid diagram. ${getErrorMessage(error)}`;
			preview.classList.add(MERMAID_PREVIEW_ERROR_CLASS);
		}
	};

	const updatePreview = (immediate: boolean): void => {
		if (disposed) {
			return;
		}
		const mermaids = extractMermaidFromText(textarea.value);
		const dark = textarea.ownerDocument.documentElement.classList.contains('oj-dark-mode');
		const key = JSON.stringify([dark, mermaids]);
		if (key === requestedKey) {
			return;
		}
		requestedKey = key;
		latestRunId += 1;
		const runId = latestRunId;
		clearTimeout(timer);
		if (mermaids.length === 0) {
			preview.replaceChildren();
			preview.classList.remove(MERMAID_PREVIEW_ERROR_CLASS);
			return;
		}
		const render = () => {
			renderPreview(mermaids, runId).catch((error: unknown) => {
				console.error({ error, msg: 'Failed to update Mermaid preview' });
			});
		};
		if (immediate) {
			render();
		} else {
			timer = setTimeout(render, PREVIEW_DEBOUNCE_MS);
		}
	};
	const onInput = () => updatePreview(false);
	textarea.addEventListener('input', onInput);
	cleanupCallbacks.push(() => {
		disposed = true;
		clearTimeout(timer);
		textarea.removeEventListener('input', onInput);
	});
	previewRerenderCallbacks.push(() => updatePreview(true));
	updatePreview(true);
};

export const commentBeautifulMermaid = async (
	ctx: ContentScriptContext,
	doc: Document,
	comments: HNComment[]
): Promise<void> => {
	const path = window.location.pathname;

	const allowedPrefixes = ['/item', '/edit', '/threads', '/newcomments'];
	if (!allowedPrefixes.some((prefix) => path.startsWith(prefix))) {
		return;
	}

	const cleanupCallbacks: (() => void)[] = [];
	const previewRerenderCallbacks: (() => void)[] = [];
	const seenTextareas = new WeakSet<HTMLTextAreaElement>();

	ensureMermaidStyles(doc);
	ensurePreviewStyles(doc);
	await renderCommentBlocks(comments);

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

	const bodyObserver = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			for (const addedNode of mutation.addedNodes) {
				attachTextareasFromAddedNode(addedNode);
			}
		}
	});
	bodyObserver.observe(doc.body, { childList: true, subtree: true });

	let darkMode = doc.documentElement.classList.contains('oj-dark-mode');
	const themeObserver = new MutationObserver(() => {
		const nextDarkMode = doc.documentElement.classList.contains('oj-dark-mode');
		if (nextDarkMode === darkMode) {
			return;
		}
		darkMode = nextDarkMode;
		rerenderMermaidBlocksInElement(doc, doc, `.${MERMAID_PREVIEW_CLASS}`).catch(
			(error: unknown) => {
				console.error('Failed to rerender mermaid blocks after theme change:', error);
			}
		);
		for (const rerender of previewRerenderCallbacks) {
			rerender();
		}
	});

	themeObserver.observe(doc.documentElement, {
		attributeFilter: ['class'],
		attributes: true,
	});

	ctx.onInvalidated(() => {
		bodyObserver.disconnect();
		themeObserver.disconnect();

		for (const cleanup of cleanupCallbacks) {
			cleanup();
		}
	});
};
