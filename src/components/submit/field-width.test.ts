import { beforeEach, describe, expect, it } from 'vitest';

import { widenFields } from './field-width.ts';

describe('widenFields', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	it('sets submit text inputs and textareas to 80 columns', () => {
		document.body.innerHTML = `
			<form>
				<input type="text" name="title" size="50">
				<input type="text" name="url" size="50">
				<textarea name="text" cols="48"></textarea>
				<input type="submit" value="submit">
			</form>
		`;

		widenFields(document);

		const titleInput = document.querySelector<HTMLInputElement>('input[name="title"]');
		const urlInput = document.querySelector<HTMLInputElement>('input[name="url"]');
		const textArea = document.querySelector<HTMLTextAreaElement>('textarea[name="text"]');
		expect(titleInput?.size).toBe(80);
		expect(urlInput?.size).toBe(80);
		expect(textArea?.getAttribute('cols')).toBe('80');
	});
});
