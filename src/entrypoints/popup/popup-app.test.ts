import { beforeEach, describe, expect, it, vi } from 'vitest';
import { browser } from '#imports';
import type { DarkModePreference } from '@/utils/dark-mode.ts';
import { getDarkModePreference } from '@/utils/dark-mode.ts';
import {
	getEnableFocusBoxPreference,
	getOpenStoryNewTabPreference,
	getShowHiddenStoriesOptionPreference,
	setEnableFocusBoxPreference,
	setOpenStoryNewTabPreference,
	setShowHiddenStoriesOptionPreference,
} from '@/utils/preferences.ts';
import { renderPopupApp } from './popup-app.tsx';

vi.mock('@/utils/dark-mode.ts', () => ({
	getDarkModePreference: vi.fn(async () => 'light'),
}));

vi.mock('@/utils/preferences.ts', () => ({
	ENABLE_FOCUS_BOX_STORAGE_KEY: 'enableFocusBox',
	OPEN_STORY_NEW_TAB_STORAGE_KEY: 'openStoryNewTab',
	SHOW_HIDDEN_STORIES_OPTION_STORAGE_KEY: 'showHiddenStoriesOption',
	getEnableFocusBoxPreference: vi.fn(async () => true),
	getOpenStoryNewTabPreference: vi.fn(async () => true),
	getShowHiddenStoriesOptionPreference: vi.fn(async () => true),
	setEnableFocusBoxPreference: vi.fn(async () => {}),
	setOpenStoryNewTabPreference: vi.fn(async () => {}),
	setShowHiddenStoriesOptionPreference: vi.fn(async () => {}),
}));

describe('renderPopupApp', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
		vi.clearAllMocks();
		vi.spyOn(browser.tabs, 'query').mockResolvedValue([{ id: 123 }] as any);
		vi.spyOn(browser.tabs, 'sendMessage').mockResolvedValue(undefined as any);
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

	it('loads the show hidden stories option preference enabled by default', async () => {
		const root = document.createElement('div');

		await renderPopupApp(document, root);

		const checkboxes = Array.from(
			root.querySelectorAll<HTMLInputElement>('input.oj-popup__checkbox')
		);
		expect(checkboxes[0]?.name).toBe('showHiddenStoriesOption');
		expect(checkboxes[0]?.checked).toBe(true);
		expect(getShowHiddenStoriesOptionPreference).toHaveBeenCalledTimes(1);
	});

	it('loads the open story in new tab preference enabled by default', async () => {
		const root = document.createElement('div');

		await renderPopupApp(document, root);

		const checkbox = root.querySelector<HTMLInputElement>('input[name="openStoryNewTab"]');
		expect(checkbox?.checked).toBe(true);
		expect(getOpenStoryNewTabPreference).toHaveBeenCalledTimes(1);
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

		await vi.waitFor(() => {
			expect(browser.tabs.sendMessage).toHaveBeenCalledWith(123, {
				type: 'oj:preferences-updated',
			});
		});
		expect(setEnableFocusBoxPreference).toHaveBeenCalledWith(false);
	});

	it('persists show hidden stories option changes', async () => {
		const root = document.createElement('div');
		await renderPopupApp(document, root);

		const checkbox = root.querySelector<HTMLInputElement>(
			'input[name="showHiddenStoriesOption"]'
		);
		if (!checkbox) {
			throw new Error('Expected show hidden stories option checkbox to exist');
		}

		checkbox.checked = false;
		checkbox.dispatchEvent(new Event('change', { bubbles: true }));

		await vi.waitFor(() => {
			expect(browser.tabs.sendMessage).toHaveBeenCalledWith(123, {
				type: 'oj:preferences-updated',
			});
		});
		expect(setShowHiddenStoriesOptionPreference).toHaveBeenCalledWith(false);
	});

	it('persists open story in new tab changes', async () => {
		const root = document.createElement('div');
		await renderPopupApp(document, root);

		const checkbox = root.querySelector<HTMLInputElement>('input[name="openStoryNewTab"]');
		if (!checkbox) {
			throw new Error('Expected open story in new tab checkbox to exist');
		}

		checkbox.checked = false;
		checkbox.dispatchEvent(new Event('change', { bubbles: true }));

		await vi.waitFor(() => {
			expect(browser.tabs.sendMessage).toHaveBeenCalledWith(123, {
				type: 'oj:preferences-updated',
			});
		});
		expect(setOpenStoryNewTabPreference).toHaveBeenCalledWith(false);
	});

	it('skips notifying the tab when there is no active tab id', async () => {
		vi.mocked(browser.tabs.query).mockResolvedValueOnce([{}] as any);
		const root = document.createElement('div');
		await renderPopupApp(document, root);

		const checkbox = root.querySelector<HTMLInputElement>('input[name="enableFocusBox"]');
		if (!checkbox) {
			throw new Error('Expected focus box checkbox to exist');
		}

		checkbox.checked = false;
		checkbox.dispatchEvent(new Event('change', { bubbles: true }));

		await vi.waitFor(() => {
			expect(setEnableFocusBoxPreference).toHaveBeenCalledWith(false);
		});
		expect(browser.tabs.sendMessage).not.toHaveBeenCalled();
	});
});
