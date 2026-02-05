import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContentScriptContext } from '#imports';
import { remaining, updateCharacterCount } from './index';

const fixtureHtml = readFileSync(
	join(import.meta.dirname, '__fixtures__', 'hn-submit-page.html'),
	'utf-8'
);

describe('remaining', () => {
	describe('updateCharacterCount', () => {
		let titleInput: HTMLInputElement;

		beforeEach(() => {
			document.body.innerHTML = fixtureHtml;
			const input = document.querySelector<HTMLInputElement>('input[name="title"]');
			if (!input) {
				throw new Error('Title input not found in fixture');
			}
			titleInput = input;
		});

		it('should create a span element and append it to the input parent', () => {
			updateCharacterCount(titleInput);

			const span = titleInput.parentElement?.querySelector('span');
			expect(span).toBeTruthy();
		});

		it('should display remaining character count when input is empty', () => {
			updateCharacterCount(titleInput);

			titleInput.value = '';
			titleInput.dispatchEvent(new Event('input'));

			const span = titleInput.parentElement?.querySelector('span');
			expect(span?.innerHTML).toBe('80 remaining');
		});

		it('should update remaining character count as user types', () => {
			updateCharacterCount(titleInput);

			titleInput.value = 'Hello';
			titleInput.dispatchEvent(new Event('input'));

			const span = titleInput.parentElement?.querySelector('span');
			expect(span?.innerHTML).toBe('75 remaining');
		});

		it('should show empty string when character limit is exceeded', () => {
			updateCharacterCount(titleInput);

			titleInput.value = 'a'.repeat(81);
			titleInput.dispatchEvent(new Event('input'));

			const span = titleInput.parentElement?.querySelector('span');
			expect(span?.innerHTML).toBe('');
		});

		it('should show "0 remaining" when exactly at limit', () => {
			updateCharacterCount(titleInput);

			titleInput.value = 'a'.repeat(80);
			titleInput.dispatchEvent(new Event('input'));

			const span = titleInput.parentElement?.querySelector('span');
			expect(span?.innerHTML).toBe('0 remaining');
		});

		it('should return the input listener function', () => {
			const listener = updateCharacterCount(titleInput);

			expect(listener).toBeDefined();
			expect(typeof listener).toBe('function');
		});
	});

	describe('main', () => {
		let mockContext: ContentScriptContext;

		beforeEach(() => {
			document.body.innerHTML = fixtureHtml;
			mockContext = {
				onInvalidated: vi.fn(),
			} as unknown as ContentScriptContext;
		});

		it('should initialize character count display for title input', () => {
			remaining.main(mockContext);

			const titleInput = document.querySelector<HTMLInputElement>('input[name="title"]');
			const span = titleInput?.parentElement?.querySelector('span');

			expect(span).toBeTruthy();
		});

		it('should return early if title input is not found', () => {
			document.body.innerHTML = '<div></div>';

			remaining.main(mockContext);

			expect(mockContext.onInvalidated).not.toHaveBeenCalled();
		});

		it('should register cleanup handler with context', () => {
			remaining.main(mockContext);

			expect(mockContext.onInvalidated).toHaveBeenCalledWith(expect.any(Function));
		});

		it('should remove event listener on context invalidation', () => {
			remaining.main(mockContext);

			const titleInput = document.querySelector<HTMLInputElement>('input[name="title"]');
			if (!titleInput) {
				throw new Error('Title input not found');
			}

			const removeEventListenerSpy = vi.spyOn(titleInput, 'removeEventListener');

			const onInvalidatedCallback = (mockContext.onInvalidated as any).mock.calls[0][0];
			onInvalidatedCallback();

			expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
		});
	});
});
