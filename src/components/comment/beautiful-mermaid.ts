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
	for (const comment of comments) {
		const commtext = comment.commentRow.querySelector<HTMLElement>('.commtext');
		if (!commtext) {
			continue;
		}
		await renderMermaidsInPreCodeElements(commtext);
	}
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

	const updatePreview = async (): Promise<void> => {
		const mermaids = extractMermaidFromText(textarea.value);
		if (mermaids.length === 0) {
			preview.replaceChildren();
			return;
		}

		// It’s a simple stale-result guard. updatePreview() is async and can overlap on rapid input; latestRunId/runId
		// ensures only the most recent invocation is allowed to update the preview. If an older run finishes after a
		// newer one, it exits early so stale SVGs or error text don’t overwrite the latest render.
		const runId = latestRunId + 1;
		latestRunId = runId;
		try {
			const svgNodes: SVGElement[] = [];
			for (const mermaid of mermaids) {
				const svgs = await createMermaidSvgNodeFromMarkup(mermaid, textarea.ownerDocument);
				if (!svgs) {
					continue;
				}
				svgNodes.push(svgs);
			}
			if (runId !== latestRunId) {
				return;
			}
			preview.classList.remove(MERMAID_PREVIEW_ERROR_CLASS);
			preview.replaceChildren(...svgNodes);
		} catch (error: unknown) {
			if (runId !== latestRunId) {
				return;
			}
			console.error('Failed to render Mermaid preview:', error);
			preview.textContent = `Could not render Mermaid diagram. ${getErrorMessage(error)}`;
			preview.classList.add(MERMAID_PREVIEW_ERROR_CLASS);
		}
	};

	const triggerUpdate = (): void => {
		updatePreview().catch((error: unknown) => {
			console.error({ msg: 'Failed to update Mermaid preview:', error });
		});
	};

	textarea.addEventListener('input', triggerUpdate);
	cleanupCallbacks.push(() => {
		textarea.removeEventListener('input', triggerUpdate);
	});
	previewRerenderCallbacks.push(triggerUpdate);
	triggerUpdate();
};

/**
 * To be honest, I'm not sure if this is the best way to do this. Right now, we listen to
 * all the changes to the textarea and rerender the preview with MutationObservers, but
 * it might just be better to set up and tear things down each time. All of this feels a bit
 * more complicated than it needs to be.
 */
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
		bodyObserver.disconnect();
		themeObserver.disconnect();

		for (const cleanup of cleanupCallbacks) {
			cleanup();
		}
	});
};
