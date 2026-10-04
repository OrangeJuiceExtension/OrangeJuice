import type { ContentScriptContext } from '#imports';
import { backticksToCode } from '@/components/comment/backticks-to-code.ts';
import { githubEmoji } from '@/components/comment/github-emoji.ts';
import { createGuidelinesNote } from '@/components/comment/init-comment-ux.ts';
import { closeInlineReply } from '@/components/comment/inline-reply.ts';
import { dom } from '@/utils/dom.ts';
import { replaceChildrenWithSanitizedHtml } from '@/utils/html.ts';
import { renderMermaidsInPreCodeElements } from '@/utils/mermaid.ts';
import { paths } from '@/utils/paths.ts';
import './inline-edit.css';

const ITEM_ID_PATTERN = /^\d+$/;
const EDIT_ACTION = `${paths.base}/xedit`;

interface EditTarget {
	link: HTMLAnchorElement;
	row: HTMLElement;
	text: HTMLElement;
	url: URL;
}

const getEditTarget = (link: HTMLAnchorElement): EditTarget | undefined => {
	const href = link.getAttribute('href');
	if (!(href && link.closest('.comhead'))) {
		return;
	}
	if (!URL.canParse(href, paths.base)) {
		return;
	}
	const url = new URL(href, paths.base);
	const id = url.searchParams.get('id');
	const row = link.closest<HTMLElement>('tr.athing');
	const text = row?.querySelector<HTMLElement>('.commtext');
	if (
		url.origin !== paths.base ||
		url.pathname !== '/edit' ||
		!id ||
		!ITEM_ID_PATTERN.test(id) ||
		row?.id !== id ||
		!text
	) {
		return;
	}
	return { link, row, text, url };
};

const fetchDocument = async (url: string, options: RequestInit): Promise<Document> => {
	const response = await fetch(url, {
		cache: 'no-store',
		credentials: 'same-origin',
		...options,
	});
	if (!response.ok) {
		throw new Error(`Hacker News returned HTTP ${response.status}`);
	}
	return new DOMParser().parseFromString(await response.text(), 'text/html');
};

const findEditForm = (doc: Document): HTMLFormElement | undefined =>
	Array.from(doc.forms).find(
		(form) => new URL(form.getAttribute('action') ?? '', paths.base).href === EDIT_ACTION
	);

const findSavedComment = (doc: Document, id: string, submittedText: string): HTMLElement | null => {
	const editForm = findEditForm(doc);
	if (editForm) {
		// HN can return the edit page again after saving, with the updated source.
		const savedId = editForm.querySelector<HTMLInputElement>('input[name="id"]')?.value;
		const savedText =
			editForm.querySelector<HTMLTextAreaElement>('textarea[name="text"]')?.value;
		if (savedId !== id || savedText !== submittedText) {
			return null;
		}
	}
	return doc.querySelector<HTMLElement>(`tr.athing[id="${id}"] .commtext`);
};

class InlineCommentEditor {
	private readonly target: EditTarget;
	private readonly onClose: () => void;
	private readonly doc: Document;
	private readonly controller = new AbortController();
	private readonly container: HTMLDivElement;
	private readonly status: HTMLDivElement;
	private readonly cancelButton: HTMLButtonElement;
	private readonly nativeLink: HTMLAnchorElement;
	private readonly originalLinkText: string;
	private readonly originalHidden: HTMLElement['hidden'];
	private textarea?: HTMLTextAreaElement;
	private submitButton?: HTMLInputElement;
	private hmac = '';

	constructor(target: EditTarget, onClose: () => void) {
		this.target = target;
		this.onClose = onClose;
		const { link, row, text, url } = target;
		this.doc = link.ownerDocument;
		this.originalLinkText = link.textContent;
		this.originalHidden = text.hidden;
		this.container = this.doc.createElement('div');
		this.container.className = 'oj-inline-edit';
		this.container.id = `oj-inline-edit-${row.id}`;
		this.status = this.doc.createElement('div');
		this.status.setAttribute('role', 'status');
		this.status.textContent = 'Loading editor…';
		this.cancelButton = this.doc.createElement('button');
		this.cancelButton.type = 'button';
		this.cancelButton.textContent = 'cancel';
		this.cancelButton.addEventListener('click', () => this.cancel());
		this.nativeLink = this.doc.createElement('a');
		this.nativeLink.href = url.href;
		this.nativeLink.textContent = 'Open edit page';
		this.nativeLink.hidden = true;
		this.container.append(this.status, this.nativeLink, this.cancelButton);
		text.after(this.container);
		link.textContent = 'cancel edit';
		link.setAttribute('aria-expanded', 'true');
		link.setAttribute('aria-controls', this.container.id);
	}

	async load(): Promise<void> {
		try {
			const page = await fetchDocument(this.target.url.href, {
				signal: this.controller.signal,
			});
			if (this.controller.signal.aborted) {
				return;
			}
			const nativeForm = findEditForm(page);
			const source = nativeForm?.querySelector<HTMLTextAreaElement>('textarea[name="text"]');
			const id = nativeForm?.querySelector<HTMLInputElement>('input[name="id"]')?.value;
			const hmac = nativeForm?.querySelector<HTMLInputElement>('input[name="hmac"]')?.value;
			if (!(nativeForm?.method === 'post' && source && hmac && id === this.target.row.id)) {
				this.showError('Hacker News no longer offers an edit form for this comment.');
				return;
			}
			this.hmac = hmac;
			this.showForm(source.value);
		} catch {
			if (!this.controller.signal.aborted) {
				this.showError('Could not load the editor. Reopen it to try again.');
			}
		}
	}

	cancel(): void {
		if (!this.cancelButton.disabled) {
			this.dispose(true);
		}
	}

	dispose(restoreFocus = false): void {
		this.controller.abort();
		this.target.text.hidden = this.originalHidden;
		this.container.remove();
		this.target.link.textContent = this.originalLinkText;
		this.target.link.removeAttribute('aria-expanded');
		this.target.link.removeAttribute('aria-controls');
		this.target.link.removeAttribute('aria-disabled');
		this.onClose();
		if (restoreFocus) {
			this.target.link.focus();
		}
	}

	private showError(message: string): void {
		this.status.setAttribute('role', 'alert');
		this.status.textContent = message;
		this.nativeLink.hidden = false;
	}

	private showForm(value: string): void {
		const form = this.doc.createElement('form');
		form.method = 'post';
		form.action = EDIT_ACTION;
		form.setAttribute('aria-label', 'Edit comment');
		const textarea = this.doc.createElement('textarea');
		textarea.name = 'text';
		textarea.rows = 8;
		textarea.cols = 80;
		textarea.required = true;
		textarea.defaultValue = value;
		textarea.setAttribute('aria-label', 'Edit comment');
		this.textarea = textarea;
		const submitButton = this.doc.createElement('input');
		submitButton.type = 'submit';
		submitButton.value = 'update';
		this.submitButton = submitButton;
		this.updateSubmitState();
		textarea.addEventListener('input', () => this.updateSubmitState());
		const actions = this.doc.createElement('div');
		actions.className = 'oj-inline-edit-actions';
		actions.append(submitButton, this.cancelButton);
		form.append(textarea, createGuidelinesNote({ doc: this.doc }), actions);
		form.addEventListener('submit', async (event) => {
			event.preventDefault();
			await this.save();
		});
		textarea.addEventListener('keydown', (event) => {
			if (event.isComposing) {
				return;
			}
			if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !event.altKey) {
				event.preventDefault();
				event.stopPropagation();
				submitButton.click();
			}
		});
		this.status.textContent = '';
		this.target.text.hidden = true;
		this.container.prepend(form);
		textarea.focus();
	}

	private setSaving(saving: boolean): void {
		this.cancelButton.disabled = saving;
		this.target.link.setAttribute('aria-disabled', String(saving));
		if (this.textarea && this.submitButton) {
			this.textarea.readOnly = saving;
			this.updateSubmitState();
		}
	}

	private updateSubmitState(): void {
		if (this.textarea && this.submitButton) {
			this.submitButton.disabled =
				this.textarea.readOnly ||
				this.textarea.value === this.textarea.defaultValue ||
				!this.textarea.value.trim();
		}
	}

	private async save(): Promise<void> {
		if (this.submitButton?.disabled || !this.textarea || this.controller.signal.aborted) {
			return;
		}
		if (!this.textarea.value.trim()) {
			this.showError('Enter some text before updating your comment.');
			this.textarea.focus();
			return;
		}
		this.setSaving(true);
		this.status.setAttribute('role', 'status');
		this.status.textContent = 'Saving…';
		this.nativeLink.hidden = true;
		const submittedText = this.textarea.value;
		let saved = false;
		try {
			const page = await fetchDocument(EDIT_ACTION, {
				body: new URLSearchParams({
					hmac: this.hmac,
					id: this.target.row.id,
					text: submittedText,
				}),
				method: 'POST',
				signal: this.controller.signal,
			});
			if (this.controller.signal.aborted) {
				return;
			}
			const updated = findSavedComment(page, this.target.row.id, submittedText);
			if (!updated) {
				this.showError('Hacker News did not confirm the edit. Your draft is still here.');
				return;
			}
			replaceChildrenWithSanitizedHtml(this.target.text, updated.innerHTML);
			backticksToCode(this.doc, [this.target.row]);
			githubEmoji(this.doc, [this.target.row]);
			this.dispose(true);
			saved = true;
		} catch {
			if (!this.controller.signal.aborted) {
				this.showError(
					'Could not confirm the save. Your draft is still here; check the edit page before retrying.'
				);
			}
		} finally {
			if (!this.controller.signal.aborted) {
				this.setSaving(false);
			}
		}
		if (saved) {
			try {
				await renderMermaidsInPreCodeElements(this.target.text);
			} catch (error: unknown) {
				console.error('Could not render diagrams in the edited comment:', error);
			}
		}
	}
}

export const inlineEdit = (ctx: ContentScriptContext, doc: Document): void => {
	if (doc.location?.pathname === '/edit') {
		return;
	}
	const editors = new Map<HTMLAnchorElement, InlineCommentEditor>();
	const onClick = async (event: MouseEvent): Promise<void> => {
		if (
			event.defaultPrevented ||
			dom.isClickModified(event) ||
			!(event.target instanceof Element)
		) {
			return;
		}
		const link = event.target.closest('a');
		if (!link) {
			return;
		}
		const target = getEditTarget(link);
		if (!target) {
			return;
		}
		event.preventDefault();
		const existing = editors.get(link);
		if (existing) {
			existing.cancel();
			return;
		}
		for (const reply of target.row.querySelectorAll<HTMLAnchorElement>('.reply a')) {
			closeInlineReply(reply);
		}
		const editor = new InlineCommentEditor(target, () => editors.delete(link));
		editors.set(link, editor);
		await editor.load();
	};
	doc.addEventListener('click', onClick);
	ctx.onInvalidated(() => {
		doc.removeEventListener('click', onClick);
		for (const editor of editors.values()) {
			editor.dispose();
		}
	});
};
