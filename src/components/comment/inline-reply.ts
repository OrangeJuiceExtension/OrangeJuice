import type { ContentScriptContext } from '#imports';
import { createGuidelinesNote } from '@/components/comment/init-comment-ux.ts';
import { dom } from '@/utils/dom.ts';
import { paths } from '@/utils/paths.ts';

/*
 * TODO: We're going to need an API in here where text can be substituted and buttons can be added
 * that implement further functionality (like the AI button). Maybe convert handleReplyClick
 * into a class or something.
 */

export const handleReplyClick = async (link: HTMLAnchorElement) => {
	const href = link.getAttribute('href');
	if (!href) {
		return;
	}

	if (toggleExistingForm(link)) {
		return;
	}

	const replyParams = await getReplyParams(href);
	if (!replyParams) {
		return;
	}

	const form = createReplyForm(replyParams);
	link.parentElement?.insertAdjacentElement('afterend', form);
	form.querySelector<HTMLTextAreaElement>('textarea')?.focus();
	link.textContent = 'hide reply';
};

const toggleExistingForm = (link: HTMLAnchorElement): boolean => {
	const existingForm = link.parentElement?.nextElementSibling;
	if (existingForm?.tagName === 'FORM') {
		existingForm.remove();
		link.textContent = 'reply';
		return true;
	}
	return false;
};

const getReplyParams = async (
	href: string
): Promise<{ goto: string; replyId: string; hmacValue: string } | undefined> => {
	const linkUrl = new URL(href, paths.base);
	const goto = linkUrl.searchParams.get('goto');
	const replyId = linkUrl.searchParams.get('id');
	if (!(goto && replyId)) {
		return;
	}

	const hmacValue = await dom.fetchHmacFromPage(href);
	return { goto, replyId, hmacValue };
};

const createReplyForm = (params: {
	goto: string;
	replyId: string;
	hmacValue: string;
}): HTMLFormElement => {
	const form = document.createElement('form');
	form.method = 'post';
	form.action = 'comment';
	form.style.marginTop = '8px';

	const textarea = createReplyTextarea();
	form.appendChild(textarea);

	form.appendChild(dom.createHiddenInput('parent', params.replyId));
	form.appendChild(dom.createHiddenInput('goto', params.goto));
	form.appendChild(dom.createHiddenInput('hmac', params.hmacValue));

	form.appendChild(createGuidelinesNote());
	form.appendChild(createSubmitContainer());

	return form;
};

const createReplyTextarea = (): HTMLTextAreaElement => {
	const textarea = document.createElement('textarea');
	textarea.name = 'text';
	textarea.rows = 8;
	textarea.cols = 80;
	textarea.wrap = 'virtual';

	const selection = getQuotedSelection();
	if (selection) {
		textarea.value = selection;
	}

	return textarea;
};

const getQuotedSelection = (): string => {
	const selection = window.getSelection()?.toString().trim();
	if (!selection) {
		return '';
	}
	return selection
		.split('\n')
		.filter((line) => line.length > 0)
		.map((line) => `> ${line}`)
		.join('\n\n');
};

const createSubmitContainer = (): HTMLDivElement => {
	const buttonContainer = document.createElement('div');
	buttonContainer.style.marginTop = '8px';
	buttonContainer.style.display = 'flex';
	buttonContainer.style.gap = '8px';

	const submitButton = document.createElement('input');
	submitButton.type = 'submit';
	submitButton.value = 'reply';

	buttonContainer.appendChild(submitButton);
	return buttonContainer;
};

export const inlineReply = (ctx: ContentScriptContext, doc: Document) => {
	const listeners = new Map<HTMLAnchorElement, (e: Event) => void>();

	// Attach listeners to all reply links
	for (const link of doc.querySelectorAll<HTMLAnchorElement>('a')) {
		const text = link.textContent?.trim();
		if (text === 'reply') {
			const handler = (e: Event) => {
				e.preventDefault();
				e.stopPropagation();
				return handleReplyClick(link);
			};
			link.addEventListener('click', handler);
			listeners.set(link, handler);
		}
	}

	// Clean up listeners
	ctx.onInvalidated(() => {
		for (const [link, handler] of listeners) {
			link.removeEventListener('click', handler);
		}
		listeners.clear();
	});
};
