import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getByRole, getByTestId } from '@testing-library/dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleReplyClick } from './index.ts';

const fixtureHtml = readFileSync(join(__dirname, '__fixtures__', 'hn-item.html'), 'utf-8');
const itemId = '46670279';
const hmacValue = '62d3dbf0610b7a13b23f62fa272a3de9e5f486fa';

describe('handleReplyClick', () => {
	beforeEach(() => {
		document.body.innerHTML = fixtureHtml;

		for (const link of document.querySelectorAll('a')) {
			const text = link.textContent?.trim();
			if (text === 'reply') {
				link.addEventListener('click', (e) => {
					e.preventDefault();
					e.stopPropagation();
					handleReplyClick(link, itemId, hmacValue);
				});
			}
		}
	});

	it('should create a form with textarea when clicking reply link', () => {
		// Execute
		const link1 = getByTestId(document.body, 'test-a-1');
		link1.click();

		// Assert
		const textbox = getByRole(document.body, 'textbox') as HTMLTextAreaElement;
		expect(textbox).toBeTruthy();
		expect(textbox.name).toBe('text');
		expect(`${textbox.rows}`).toBe('8');
		expect(`${textbox.cols}`).toBe('80');

		const form = textbox.closest('form');
		expect(form).toBeTruthy();
		expect(form?.method).toBe('post');
		expect(form?.action).toContain('comment');

		const parentInput = form?.querySelector('input[name="parent"]') as HTMLInputElement;
		expect(parentInput?.value).toBe('46671233');

		const gotoInput = form?.querySelector('input[name="goto"]') as HTMLInputElement;
		expect(gotoInput?.value).toBe('item?id=46670279#46671233');

		const hmacInput = form?.querySelector('input[name="hmac"]') as HTMLInputElement;
		expect(hmacInput?.value).toBe(hmacValue);

		const submitButton = form?.querySelector('input[type="submit"]') as HTMLInputElement;
		expect(submitButton?.value).toBe('add comment');

		expect(link1.textContent).toBe('hide reply');
	});

	it('should remove form and restore link text when clicking hide reply', () => {
		const link1 = getByTestId(document.body, 'test-a-1');

		// First click to create form
		link1.click();
		expect(getByRole(document.body, 'textbox')).toBeTruthy();
		expect(link1.textContent).toBe('hide reply');

		// Second click to remove form
		link1.click();
		expect(document.body.querySelector('textarea[name="text"]')).toBeNull();
		expect(link1.textContent).toBe('reply');
	});

	it('should populate textarea with selected text as quoted', () => {
		// Mock window.getSelection
		const mockSelection = {
			toString: () => 'Line 1\nLine 2\n\nLine 3',
		};
		vi.stubGlobal('getSelection', () => mockSelection);

		// Execute
		const link1 = getByTestId(document.body, 'test-a-1');
		link1.click();

		// Assert
		const textarea = getByRole(document.body, 'textbox') as HTMLTextAreaElement;
		expect(textarea.value).toBe('> Line 1\n\n> Line 2\n\n> Line 3');
	});

	it('should handle multiple reply links independently', () => {
		// Execute - click first link
		const link1 = getByTestId(document.body, 'test-a-1');
		link1.click();

		// Execute - click second link
		const link2 = getByTestId(document.body, 'test-a-2');
		link2.click();

		// Assert - both forms should exist
		const textareas = document.body.querySelectorAll('textarea[name="text"]');
		expect(textareas.length).toBe(2);

		const form1 = link1.parentElement?.parentElement?.querySelector('form');
		const parent1Input = form1?.querySelector('input[name="parent"]') as HTMLInputElement;
		expect(parent1Input?.value).toBe('46671233');

		const form2 = link2.parentElement?.parentElement?.querySelector('form');
		const parent2Input = form2?.querySelector('input[name="parent"]') as HTMLInputElement;
		expect(parent2Input?.value).toBe('46671273');
	});

	it('should focus the textarea when form is created', () => {
		// Execute
		const link1 = getByTestId(document.body, 'test-a-1');
		link1.click();

		// Assert
		const textarea = getByRole(document.body, 'textbox') as HTMLTextAreaElement;
		expect(document.activeElement).toBe(textarea);
	});
});
