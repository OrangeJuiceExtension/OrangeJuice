import { fireEvent, getByRole, queryByRole, waitFor } from '@testing-library/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContentScriptContext } from '#imports';
import { dom } from '@/utils/dom.ts';
import { inlineEdit } from './inline-edit.ts';
import { handleReplyClick } from './inline-reply.ts';

const COMMENT_ID = '49956120';
const THREAD_PATH = '/item?id=49946885';
const EDIT_URL = `https://news.ycombinator.com/edit?id=${COMMENT_ID}`;
const EDIT_ACTION = 'https://news.ycombinator.com/xedit';
const SOURCE_TEXT = 'Original *formatting* & <text>\n\nSecond paragraph.';

const commentHtml = (id = COMMENT_ID, text = 'Original comment', root = false): string => `
	<table><tbody><tr class="athing ${root ? '' : 'comtr'}" id="${id}"><td>
		<table><tbody><tr><td class="default">
			<div class="comhead"><a href="user?id=owner">owner</a> | <a href="edit?id=${id}">edit</a></div>
			<div class="comment"><div class="commtext">${text}</div>
				<div class="reply"><a href="reply?id=${id}&amp;goto=item%3Fid%3D49946885">reply</a></div>
			</div>
		</td></tr></tbody></table>
	</td></tr></tbody></table>`;

const editHtml = (
	id = COMMENT_ID,
	source = SOURCE_TEXT,
	renderedText = 'Original comment'
): string => `
	${commentHtml(id, renderedText)}
	<form class="itemform" action="/xedit" method="post">
		<script>throw new Error('Native edit scripts must not run');</script>
		<input type="hidden" name="id" value="${id}">
		<input type="hidden" name="hmac" value="test-hmac">
		<textarea name="text">${source.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</textarea>
		<input type="submit" value="update">
	</form>`;

describe('inline comment editing', () => {
	let invalidate: () => void;
	let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

	const start = (): void => {
		inlineEdit(
			{
				onInvalidated: (callback: () => void) => {
					invalidate = callback;
				},
			} as ContentScriptContext,
			document
		);
	};

	const openEditor = async (): Promise<HTMLTextAreaElement> => {
		fireEvent.click(getByRole(document.body, 'link', { name: 'edit' }));
		return await waitFor(() =>
			getByRole<HTMLTextAreaElement>(document.body, 'textbox', { name: 'Edit comment' })
		);
	};

	beforeEach(() => {
		window.history.replaceState(null, '', THREAD_PATH);
		document.body.innerHTML = commentHtml();
		invalidate = () => undefined;
		fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => new Response(editHtml()));
		vi.stubGlobal('fetch', fetchMock);
	});

	afterEach(() => {
		invalidate();
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it("closes the same comment's reply before opening edit and leaves other replies alone", async () => {
		document.body.innerHTML += commentHtml('2', 'Another comment');
		vi.spyOn(dom, 'fetchHmacFromPage').mockResolvedValue('reply-hmac');
		const comment = document.getElementById(COMMENT_ID) as HTMLElement;
		const otherComment = document.getElementById('2') as HTMLElement;
		const reply = getByRole<HTMLAnchorElement>(comment, 'link', { name: 'reply' });
		const otherReply = getByRole<HTMLAnchorElement>(otherComment, 'link', { name: 'reply' });
		await handleReplyClick(reply);
		await handleReplyClick(otherReply);
		const replyTextarea = getByRole<HTMLTextAreaElement>(comment, 'textbox');
		fireEvent.input(replyTextarea, { target: { value: 'Unsent reply' } });
		const otherTextarea = getByRole(otherComment, 'textbox');
		start();
		fireEvent.click(getByRole(comment, 'link', { name: 'edit' }));
		expect(replyTextarea.isConnected).toBe(false);
		expect(reply.textContent).toBe('reply');
		const editor = await waitFor(() => getByRole(comment, 'textbox', { name: 'Edit comment' }));
		expect(document.activeElement).toBe(editor);
		expect(otherTextarea.isConnected).toBe(true);
		fireEvent.click(getByRole(comment, 'button', { name: 'cancel' }));
		expect(queryByRole(comment, 'textbox')).toBeNull();
		await handleReplyClick(reply);
		expect(getByRole<HTMLTextAreaElement>(comment, 'textbox').value).toBe('');
	});

	it.each([false, true])(
		'discards a pending reply when switching to edit (cancel edit: %s)',
		async (cancelEdit) => {
			let finishReply: (value: string) => void = () => undefined;
			vi.spyOn(dom, 'fetchHmacFromPage').mockReturnValueOnce(
				new Promise((resolve) => {
					finishReply = resolve;
				})
			);
			const reply = getByRole<HTMLAnchorElement>(document.body, 'link', { name: 'reply' });
			const pendingReply = handleReplyClick(reply);
			start();
			await openEditor();
			if (cancelEdit) {
				fireEvent.click(getByRole(document.body, 'button', { name: 'cancel' }));
			}
			finishReply('reply-hmac');
			await pendingReply;
			expect(document.querySelector('form[action="comment"]')).toBeNull();
			expect(reply.textContent).toBe('reply');
			expect(document.querySelectorAll('textarea')).toHaveLength(cancelEdit ? 0 : 1);
		}
	);

	it.each([
		{ name: 'thread reply', root: false },
		{ name: 'root comment', root: true },
	])('opens the original source inline for a $name', async ({ root }) => {
		document.body.innerHTML = commentHtml(COMMENT_ID, 'Rendered comment', root);
		start();
		const textarea = await openEditor();
		expect(textarea.value).toBe(SOURCE_TEXT);
		expect(document.activeElement).toBe(textarea);
		expect(document.querySelector<HTMLElement>('.commtext')?.hidden).toBe(true);
		expect(window.location.pathname + window.location.search).toBe(THREAD_PATH);
		expect(fetchMock).toHaveBeenCalledWith(EDIT_URL, {
			cache: 'no-store',
			credentials: 'same-origin',
			signal: expect.any(AbortSignal),
		});
		expect(document.querySelector('.oj-inline-edit script')).toBeNull();
	});

	it.each(['button', 'link'])(
		'cancels using the $0 and restores the original comment and focus',
		async (control) => {
			start();
			const textarea = await openEditor();
			fireEvent.input(textarea, { target: { value: 'Unsaved changes' } });
			fireEvent.click(
				getByRole(document.body, control, {
					name: control === 'button' ? 'cancel' : 'cancel edit',
				})
			);
			expect(queryByRole(document.body, 'textbox')).toBeNull();
			expect(document.querySelector<HTMLElement>('.commtext')?.hidden).toBe(false);
			expect(document.querySelector('.commtext')?.textContent).toBe('Original comment');
			const editLink = getByRole(document.body, 'link', { name: 'edit' });
			expect(document.activeElement).toBe(editLink);
			expect(editLink.hasAttribute('aria-controls')).toBe(false);
			expect(fetchMock).toHaveBeenCalledTimes(1);
		}
	);

	it('enables update only for a changed, nonempty draft', async () => {
		start();
		const textarea = await openEditor();
		const update = getByRole<HTMLInputElement>(document.body, 'button', { name: 'update' });
		expect(update.disabled).toBe(true);
		for (const { value, disabled } of [
			{ disabled: false, value: `${SOURCE_TEXT} Edited.` },
			{ disabled: true, value: SOURCE_TEXT },
			{ disabled: true, value: '' },
			{ disabled: true, value: '   \n' },
			{ disabled: false, value: 'New draft' },
		]) {
			fireEvent.input(textarea, { target: { value } });
			expect(update.disabled).toBe(disabled);
		}
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it.each(['button', 'link'])(
		'allows cancelling an unchanged draft with the %s',
		async (control) => {
			start();
			await openEditor();
			fireEvent.click(
				getByRole(document.body, control, {
					name: control === 'button' ? 'cancel' : 'cancel edit',
				})
			);
			expect(queryByRole(document.body, 'textbox')).toBeNull();
			expect(fetchMock).toHaveBeenCalledTimes(1);
		}
	);

	it('does not submit unchanged text through the form or keyboard shortcuts', async () => {
		start();
		const textarea = await openEditor();
		fireEvent.submit(getByRole(document.body, 'form', { name: 'Edit comment' }));
		fireEvent.keyDown(textarea, { ctrlKey: true, key: 'Enter' });
		fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true });
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it.each([
		{
			name: 'comment page',
			response: commentHtml(COMMENT_ID, 'Updated &amp; <i>formatted</i>'),
		},
		{
			name: 'native edit page with the saved source',
			response: editHtml(
				COMMENT_ID,
				'Updated & *formatted*',
				'Updated &amp; <i>formatted</i>'
			),
		},
	])('refreshes only the edited text when HN returns a $name', async ({ response }) => {
		document.body.innerHTML += commentHtml('2', 'Unrelated comment');
		const sibling = document.querySelector('[id="2"]');
		start();
		fireEvent.click(
			getByRole(document.querySelector(`[id="${COMMENT_ID}"]`) as HTMLElement, 'link', {
				name: 'edit',
			})
		);
		const textarea = await waitFor(() =>
			getByRole<HTMLTextAreaElement>(document.body, 'textbox', { name: 'Edit comment' })
		);
		fireEvent.input(textarea, { target: { value: 'Updated & *formatted*' } });
		fetchMock.mockResolvedValueOnce(new Response(response));
		fireEvent.click(getByRole(document.body, 'button', { name: 'update' }));
		await waitFor(() => expect(document.querySelector('.oj-inline-edit')).toBeNull());
		const [, request] = fetchMock.mock.calls;
		expect(request?.[0]).toBe(EDIT_ACTION);
		expect(request?.[1]?.method).toBe('POST');
		expect(request?.[1]?.body?.toString()).toBe(
			new URLSearchParams({
				hmac: 'test-hmac',
				id: COMMENT_ID,
				text: 'Updated & *formatted*',
			}).toString()
		);
		expect(document.querySelector('.commtext i')?.textContent).toBe('formatted');
		expect(document.querySelector<HTMLElement>('.commtext')?.hidden).toBe(false);
		expect(document.querySelector('[id="2"]')).toBe(sibling);
		expect(window.location.pathname + window.location.search).toBe(THREAD_PATH);
		expect(document.activeElement?.textContent).toBe('edit');
		expect(document.activeElement?.hasAttribute('aria-disabled')).toBe(false);
	});

	it('sanitizes returned markup and reapplies comment formatting', async () => {
		start();
		const textarea = await openEditor();
		fireEvent.input(textarea, { target: { value: 'Updated `code` :smile:' } });
		fetchMock.mockResolvedValueOnce(
			new Response(
				commentHtml(
					COMMENT_ID,
					'<i>Updated</i> `code` :smile: <script>bad()</script><img src="x" onerror="bad()">'
				)
			)
		);
		fireEvent.click(getByRole(document.body, 'button', { name: 'update' }));
		await waitFor(() => expect(document.querySelector('.oj-inline-edit')).toBeNull());
		expect(document.querySelector('.commtext code')?.textContent).toBe('code');
		expect(document.querySelector('.commtext')?.textContent).toContain('😄');
		expect(document.querySelector('.commtext script, .commtext [onerror]')).toBeNull();
	});

	it.each([
		{ ctrlKey: true, metaKey: false, name: 'Ctrl+Enter' },
		{ ctrlKey: false, metaKey: true, name: 'Cmd+Enter' },
	])('saves with $name', async ({ ctrlKey, metaKey }) => {
		start();
		const textarea = await openEditor();
		fireEvent.input(textarea, { target: { value: 'Saved' } });
		fetchMock.mockResolvedValueOnce(new Response(commentHtml(COMMENT_ID, 'Saved')));
		fireEvent.keyDown(textarea, { ctrlKey, key: 'Enter', metaKey });
		await waitFor(() => expect(document.querySelector('.commtext')?.textContent).toBe('Saved'));
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it.each([
		{ key: 'Enter', name: 'Enter' },
		{ altKey: true, ctrlKey: true, key: 'Enter', name: 'Alt+Ctrl+Enter' },
		{ ctrlKey: true, isComposing: true, key: 'Enter', name: 'composing Ctrl+Enter' },
	])('does not save with $name', async ({ name: _name, ...keys }) => {
		start();
		const textarea = await openEditor();
		fireEvent.input(textarea, { target: { value: 'Unsaved draft' } });
		fireEvent.keyDown(textarea, keys);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it.each([
		{ name: 'network failure', response: undefined },
		{ name: 'HTTP failure', response: new Response('Unavailable', { status: 503 }) },
		{ name: 'expired edit', response: new Response('This item can no longer be edited.') },
		{ name: 'validation error with the old comment', response: new Response(editHtml()) },
		{ name: 'login page', response: new Response('<form action="login">Please log in</form>') },
		{ name: 'another comment', response: new Response(commentHtml('2', 'Wrong comment')) },
	])('keeps the draft and old comment after a $name', async ({ response }) => {
		start();
		const textarea = await openEditor();
		fireEvent.input(textarea, { target: { value: 'Keep this draft' } });
		if (response) {
			fetchMock.mockResolvedValueOnce(response);
		} else {
			fetchMock.mockRejectedValueOnce(new TypeError('Offline'));
		}
		fireEvent.click(getByRole(document.body, 'button', { name: 'update' }));
		await waitFor(() =>
			expect(getByRole(document.body, 'alert').textContent).toContain('draft')
		);
		expect(textarea.value).toBe('Keep this draft');
		expect(textarea.readOnly).toBe(false);
		expect(document.querySelector('.commtext')?.textContent).toBe('Original comment');
		expect(
			getByRole<HTMLAnchorElement>(document.body, 'link', { name: 'Open edit page' }).href
		).toBe(EDIT_URL);
		expect(
			getByRole<HTMLButtonElement>(document.body, 'button', { name: 'update' }).disabled
		).toBe(false);
	});

	it.each([
		{ html: 'This item can no longer be edited.', name: 'expired permission' },
		{ html: editHtml('2'), name: 'wrong comment ID' },
		{ html: editHtml().replace('value="test-hmac"', 'value=""'), name: 'missing token' },
		{
			html: editHtml().replace('/xedit', 'https://example.com/xedit'),
			name: 'foreign form action',
		},
	])('leaves the comment readable when opening fails: $name', async ({ html }) => {
		fetchMock.mockResolvedValueOnce(new Response(html));
		start();
		fireEvent.click(getByRole(document.body, 'link', { name: 'edit' }));
		await waitFor(() => expect(getByRole(document.body, 'alert')).toBeTruthy());
		expect(queryByRole(document.body, 'textbox')).toBeNull();
		expect(document.querySelector<HTMLElement>('.commtext')?.hidden).toBe(false);
	});

	it('cancels an in-flight load and ignores its late response', async () => {
		let finish: (response: Response) => void = () => undefined;
		fetchMock.mockReturnValueOnce(
			new Promise((resolve) => {
				finish = resolve;
			})
		);
		start();
		fireEvent.click(getByRole(document.body, 'link', { name: 'edit' }));
		const signal = fetchMock.mock.calls[0]?.[1]?.signal;
		fireEvent.click(getByRole(document.body, 'button', { name: 'cancel' }));
		finish(new Response(editHtml()));
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(signal?.aborted).toBe(true);
		expect(document.querySelector('.oj-inline-edit')).toBeNull();
	});

	it('prevents duplicate submissions and cancellation during a save', async () => {
		let finish: (response: Response) => void = () => undefined;
		start();
		const textarea = await openEditor();
		fireEvent.input(textarea, { target: { value: 'Saved once' } });
		fetchMock.mockReturnValueOnce(
			new Promise((resolve) => {
				finish = resolve;
			})
		);
		const form = getByRole(document.body, 'form', { name: 'Edit comment' });
		fireEvent.submit(form);
		fireEvent.submit(form);
		fireEvent.click(getByRole(document.body, 'link', { name: 'cancel edit' }));
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(textarea.readOnly).toBe(true);
		expect(
			getByRole<HTMLButtonElement>(document.body, 'button', { name: 'cancel' }).disabled
		).toBe(true);
		finish(new Response(commentHtml(COMMENT_ID, 'Saved once')));
		await waitFor(() => expect(document.querySelector('.oj-inline-edit')).toBeNull());
	});

	it('removes listeners, cancels requests, and restores comments on invalidation', async () => {
		start();
		await openEditor();
		const signal = fetchMock.mock.calls[0]?.[1]?.signal;
		invalidate();
		expect(signal?.aborted).toBe(true);
		expect(document.querySelector('.oj-inline-edit')).toBeNull();
		expect(document.querySelector<HTMLElement>('.commtext')?.hidden).toBe(false);
		const click = new MouseEvent('click', { bubbles: true, cancelable: true });
		getByRole(document.body, 'link', { name: 'edit' }).dispatchEvent(click);
		expect(click.defaultPrevented).toBe(false);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it.each([
		{ href: `edit?id=${COMMENT_ID}`, metaKey: true, name: 'modified click' },
		{ href: `https://example.com/edit?id=${COMMENT_ID}`, name: 'external link' },
		{ href: 'edit?id=2', name: 'mismatched ID' },
		{ href: 'edit?id=invalid', name: 'invalid ID' },
	])('keeps native navigation for a $name', ({ href, metaKey }) => {
		const link = getByRole<HTMLAnchorElement>(document.body, 'link', { name: 'edit' });
		link.href = href;
		start();
		const click = new MouseEvent('click', { bubbles: true, cancelable: true, metaKey });
		link.dispatchEvent(click);
		expect(click.defaultPrevented).toBe(false);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('leaves the dedicated edit page alone', () => {
		window.history.replaceState(null, '', `/edit?id=${COMMENT_ID}`);
		start();
		const click = new MouseEvent('click', { bubbles: true, cancelable: true });
		getByRole(document.body, 'link', { name: 'edit' }).dispatchEvent(click);
		expect(click.defaultPrevented).toBe(false);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
