import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import { dom } from '@/utils/dom.ts';
import { paths } from '@/utils/paths.ts';
import type { ComponentFeature } from '@/utils/types.ts';

/*
 * TODO: We're going to need an API in here where text can be substituted and buttons can be added
 * that implement further functionality (like the AI button). Maybe convert handleReplyClick
 * into a class or something.
 */

export const handleReplyClick = (link: HTMLAnchorElement, itemId: string, hmacValue: string) => {
	// Check if form already exists, which toggles the display and the link
	const existingForm = link.parentElement?.nextElementSibling;
	if (existingForm?.tagName === 'FORM') {
		existingForm.remove();
		link.textContent = 'reply';
		return;
	}

	const replyId = dom.getReplyIdFromLink(link);

	// Create form
	const form = document.createElement('form');
	form.method = 'post';
	form.action = 'comment';
	form.style.marginTop = '8px';

	// Create textarea
	const textarea = document.createElement('textarea');
	textarea.name = 'text';
	textarea.rows = 8;
	textarea.cols = 80;
	textarea.wrap = 'virtual';

	// Add selected text as quoted
	const selection = window.getSelection()?.toString().trim();
	if (selection) {
		textarea.value = selection
			.split('\n')
			.filter((line) => line.length > 0)
			.map((line) => `> ${line}`)
			.join('\n\n');
	}

	form.appendChild(textarea);

	// Create and append hidden inputs
	form.appendChild(dom.createHiddenInput('parent', replyId));
	form.appendChild(dom.createHiddenInput('goto', `item?id=${itemId}#${replyId}`));
	form.appendChild(dom.createHiddenInput('hmac', hmacValue));

	// Create submit buttons container
	const buttonContainer = document.createElement('div');
	buttonContainer.style.marginTop = '8px';
	buttonContainer.style.display = 'flex';
	buttonContainer.style.gap = '8px';

	const submitButton = document.createElement('input');
	submitButton.type = 'submit';
	submitButton.name = 'submit_comment';
	submitButton.value = 'add comment';

	buttonContainer.appendChild(submitButton);
	form.appendChild(buttonContainer);

	// Insert form after the parent element
	link.parentElement?.insertAdjacentElement('afterend', form);

	// Focus the textarea
	textarea.focus();

	// Change link text
	link.textContent = 'hide reply';
};

export const inlineReply: ComponentFeature = {
	id: 'inline-reply',
	loginRequired: true,
	matches: [`${paths.base}/item?*`, `${paths.base}/threads?*`],
	runAt: 'document_end',
	main(ctx: ContentScriptContext) {
		const itemId = dom.getHiddenInputValue(document, 'parent');
		const listeners = new Map<HTMLAnchorElement, (e: Event) => void>();

		// Attach listeners to all reply links
		for (const link of document.querySelectorAll('a')) {
			const text = link.textContent?.trim();
			if (text === 'reply') {
				const handler = async (e: Event) => {
					e.preventDefault();
					e.stopPropagation();
					const href = link.getAttribute('href') || '';
					const hmacValue = await dom.fetchHmacFromPage(href);
					handleReplyClick(link, itemId, hmacValue);
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
	},
};
