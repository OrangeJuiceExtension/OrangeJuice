export const replyFocusTextarea = (doc: Document): void => {
	if (doc.location.hash !== '#reply') {
		return;
	}

	const focusTextarea = (textarea: HTMLTextAreaElement) => {
		textarea.focus();
		textarea.scrollIntoView({ block: 'center' });
	};

	const existing = doc.querySelector<HTMLTextAreaElement>('form textarea, textarea[name="text"]');
	if (existing) {
		focusTextarea(existing);
		return;
	}

	const observer = new MutationObserver((mutationsList) => {
		for (const mutation of mutationsList) {
			for (const node of mutation.addedNodes) {
				if (!(node instanceof HTMLElement)) {
					continue;
				}
				const textarea = node.querySelector<HTMLTextAreaElement>('textarea');
				if (textarea) {
					focusTextarea(textarea);
					observer.disconnect();
					return;
				}
			}
		}
	});

	observer.observe(doc.body, { childList: true, subtree: true });
};
