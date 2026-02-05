import { beforeEach, describe, expect, it, vi } from 'vitest';
import { replyFocusTextarea } from '@/components/comment/reply-focus.ts';

describe('replyFocusTextarea', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
		vi.clearAllMocks();
	});

	it('should focus textarea when hash is #reply', () => {
		window.location.hash = '#reply';
		const form = document.createElement('form');
		const textarea = document.createElement('textarea');
		form.appendChild(textarea);
		document.body.appendChild(form);
		const focusSpy = vi.spyOn(textarea, 'focus');
		const scrollSpy = vi.spyOn(textarea, 'scrollIntoView');

		replyFocusTextarea(document);

		expect(focusSpy).toHaveBeenCalled();
		expect(scrollSpy).toHaveBeenCalledWith({ block: 'center' });
	});

	it('should not focus when hash is not #reply', () => {
		window.location.hash = '';
		const form = document.createElement('form');
		const textarea = document.createElement('textarea');
		form.appendChild(textarea);
		document.body.appendChild(form);
		const focusSpy = vi.spyOn(textarea, 'focus');

		replyFocusTextarea(document);

		expect(focusSpy).not.toHaveBeenCalled();
	});
});
