import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DarkModePreference } from '@/utils/dark-mode.ts';
import { getDarkModePreference } from '@/utils/dark-mode.ts';
import { getEnableFocusBoxPreference, setEnableFocusBoxPreference } from '@/utils/preferences.ts';
import { renderPopupApp } from './popup-app.tsx';

vi.mock('@/utils/dark-mode.ts', () => ({
	getDarkModePreference: vi.fn(async () => 'light'),
}));

vi.mock('@/utils/preferences.ts', () => ({
	ENABLE_FOCUS_BOX_STORAGE_KEY: 'enableFocusBox',
	getEnableFocusBoxPreference: vi.fn(async () => true),
	setEnableFocusBoxPreference: vi.fn(async () => {}),
}));

describe('renderPopupApp', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
		vi.clearAllMocks();
	});

	it.each([
		{
			name: 'uses the default light theme when storage is empty',
			storedTheme: 'light' as DarkModePreference,
			expectedClass: 'oj-popup oj-popup--light',
		},
		{
			name: 'uses the stored dark theme when available',
			storedTheme: 'dark' as DarkModePreference,
			expectedClass: 'oj-popup oj-popup--dark',
		},
	])('$name', async ({ storedTheme, expectedClass }) => {
		vi.mocked(getDarkModePreference).mockResolvedValueOnce(storedTheme);
		const root = document.createElement('div');

		await renderPopupApp(document, root);

		const popup = root.querySelector('main.oj-popup');
		expect(popup?.className).toBe(expectedClass);
		expect(popup?.querySelector('.oj-popup__title')?.textContent).toBe('Preferences');
		expect(popup?.querySelector('.oj-popup__text')?.textContent).toBe(
			'Control the Orange Juice.'
		);
		const logo = popup?.querySelector<HTMLImageElement>('.oj-popup__logo');
		expect(logo?.alt).toBe('Orange Juice logo');
		expect(logo?.src.startsWith('chrome-extension://')).toBe(true);
		expect(logo?.src.endsWith('/icon/orange_juice_icon_128x128.png')).toBe(true);
	});

	it('loads the focus box preference enabled by default', async () => {
		const root = document.createElement('div');

		await renderPopupApp(document, root);

		const checkbox = root.querySelector<HTMLInputElement>('input[name="enableFocusBox"]');
		expect(checkbox?.checked).toBe(true);
		expect(getEnableFocusBoxPreference).toHaveBeenCalledTimes(1);
	});

	it('persists checkbox changes', async () => {
		const root = document.createElement('div');
		await renderPopupApp(document, root);

		const checkbox = root.querySelector<HTMLInputElement>('input[name="enableFocusBox"]');
		if (!checkbox) {
			throw new Error('Expected focus box checkbox to exist');
		}

		checkbox.checked = false;
		checkbox.dispatchEvent(new Event('change', { bubbles: true }));

		expect(setEnableFocusBoxPreference).toHaveBeenCalledWith(false);
	});
});
