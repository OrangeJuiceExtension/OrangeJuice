import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	DARK_MODE_CACHE_KEY,
	DARK_MODE_CLASS,
	DARK_MODE_STORAGE_KEY,
	enableDarkMode,
	setDarkModePreference,
	toggleDarkModePreference,
} from '@/utils/dark-mode.ts';
import lStorage from '@/utils/local-storage.ts';

describe('dark-mode', () => {
	let cacheWriteSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(async () => {
		await lStorage.setItem(DARK_MODE_STORAGE_KEY, null);
		document.documentElement.classList.remove(DARK_MODE_CLASS);
		document.documentElement.style.removeProperty('color-scheme');
		cacheWriteSpy = vi.spyOn(localStorage, 'setItem');
	});

	describe('setDarkModePreference', () => {
		it('applies dark mode class for dark preference', async () => {
			await setDarkModePreference('dark');

			expect(document.documentElement.classList.contains(DARK_MODE_CLASS)).toBe(true);
			expect(document.documentElement.style.colorScheme).toBe('dark');
			expect(cacheWriteSpy).toHaveBeenCalledWith(DARK_MODE_CACHE_KEY, 'dark');
		});

		it('removes dark mode class for light preference', async () => {
			await setDarkModePreference('dark');
			await setDarkModePreference('light');

			expect(document.documentElement.classList.contains(DARK_MODE_CLASS)).toBe(false);
			expect(cacheWriteSpy).toHaveBeenCalledWith(DARK_MODE_CACHE_KEY, 'light');
		});
	});

	describe('enableDarkMode', () => {
		it('applies and caches dark mode when stored preference is dark', async () => {
			await lStorage.setItem(DARK_MODE_STORAGE_KEY, 'dark');

			await enableDarkMode();

			expect(document.documentElement.classList.contains(DARK_MODE_CLASS)).toBe(true);
			expect(cacheWriteSpy).toHaveBeenCalledWith(DARK_MODE_CACHE_KEY, 'dark');
		});

		it('falls back to system preference when no stored value exists', async () => {
			vi.spyOn(window, 'matchMedia').mockReturnValue({
				matches: true,
			} as MediaQueryList);

			await enableDarkMode();

			expect(document.documentElement.classList.contains(DARK_MODE_CLASS)).toBe(true);
			expect(cacheWriteSpy).toHaveBeenCalledWith(DARK_MODE_CACHE_KEY, 'dark');
		});

		it('does not apply dark mode for light system preference', async () => {
			vi.spyOn(window, 'matchMedia').mockReturnValue({
				matches: false,
			} as MediaQueryList);

			await enableDarkMode();

			expect(document.documentElement.classList.contains(DARK_MODE_CLASS)).toBe(false);
			expect(cacheWriteSpy).toHaveBeenCalledWith(DARK_MODE_CACHE_KEY, 'light');
		});
	});

	describe('toggleDarkModePreference', () => {
		it('toggles from light to dark', async () => {
			await setDarkModePreference('light');

			const result = await toggleDarkModePreference();

			expect(result).toBe('dark');
			expect(document.documentElement.classList.contains(DARK_MODE_CLASS)).toBe(true);
			expect(cacheWriteSpy).toHaveBeenCalledWith(DARK_MODE_CACHE_KEY, 'dark');
		});

		it('toggles from dark to light', async () => {
			await setDarkModePreference('dark');

			const result = await toggleDarkModePreference();

			expect(result).toBe('light');
			expect(document.documentElement.classList.contains(DARK_MODE_CLASS)).toBe(false);
			expect(cacheWriteSpy).toHaveBeenCalledWith(DARK_MODE_CACHE_KEY, 'light');
		});
	});
});
