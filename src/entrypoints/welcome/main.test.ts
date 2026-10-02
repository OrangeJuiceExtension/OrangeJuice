import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('welcome theme', () => {
	beforeEach(() => {
		vi.resetModules();
		window.localStorage.clear();
		document.documentElement.classList.remove('oj-dark-mode');
		document.body.innerHTML =
			'<button type="button" class="oj-welcome-theme-toggle" aria-label="Toggle dark mode"></button>';
	});

	it.each([
		{ dark: true, stored: '1' },
		{ dark: false, stored: '0' },
	])('restores the saved theme $stored when the page loads', async ({ stored, dark }) => {
		window.localStorage.setItem('oj_welcome_dark_mode', stored);
		await import('./main.ts');
		expect(document.documentElement.classList.contains('oj-dark-mode')).toBe(dark);
		expect(document.querySelector('button')?.getAttribute('aria-pressed')).toBe(String(dark));
	});

	it('saves the selected theme for the next page load', async () => {
		window.localStorage.setItem('oj_welcome_dark_mode', '0');
		await import('./main.ts');
		document.querySelector('button')?.click();
		expect(window.localStorage.getItem('oj_welcome_dark_mode')).toBe('1');
		vi.resetModules();
		await import('./main.ts');
		expect(document.documentElement.classList.contains('oj-dark-mode')).toBe(true);
	});
});
