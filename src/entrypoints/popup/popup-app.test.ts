import { beforeEach, describe, expect, it, vi } from 'vitest';
import lStorage from '@/utils/local-storage.ts';
import { renderPopupApp } from './popup-app.tsx';

vi.mock('@/utils/local-storage.ts', () => ({
	default: {
		getItem: vi.fn(async () => null),
	},
}));

describe('renderPopupApp', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
		vi.clearAllMocks();
	});

	it.each([
		{
			name: 'uses the default light theme when storage is empty',
			storedTheme: null,
			expectedClass: 'oj-popup oj-popup--light',
		},
		{
			name: 'uses the stored dark theme when available',
			storedTheme: 'dark',
			expectedClass: 'oj-popup oj-popup--dark',
		},
		{
			name: 'ignores unsupported stored theme values',
			storedTheme: 'sepia',
			expectedClass: 'oj-popup oj-popup--light',
		},
	])('$name', async ({ storedTheme, expectedClass }) => {
		vi.mocked(lStorage.getItem).mockResolvedValueOnce(storedTheme);
		const root = document.createElement('div');

		await renderPopupApp(document, root);

		const popup = root.querySelector('main.oj-popup');
		expect(popup?.className).toBe(expectedClass);
		expect(popup?.querySelector('.oj-popup__title')?.textContent).toBe('Coming Soon');
		expect(popup?.querySelector('.oj-popup__text')?.textContent).toBe(
			'The Orange Juice popup is on the way. Suggestions welcome!'
		);
		const logo = popup?.querySelector<HTMLImageElement>('.oj-popup__logo');
		expect(logo?.alt).toBe('Orange Juice logo');
		expect(logo?.src).toContain('https://oj-hn.com/assets/image-128.png');
	});
});
