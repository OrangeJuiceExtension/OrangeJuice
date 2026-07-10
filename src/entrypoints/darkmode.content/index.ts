import { defineContentScript } from '#imports';
import '@/utils/dark-mode.css';
import {
	DARK_MODE_CACHE_KEY,
	DARK_MODE_CLASS,
	INFO_PAGE_CLASS,
	THEME_PENDING_CLASS,
} from '@/utils/dark-mode.ts';
import { paths } from '@/utils/paths.ts';

const readCachedMode = (): 'dark' | 'light' | null => {
	try {
		const value = localStorage.getItem(DARK_MODE_CACHE_KEY);
		if (value === 'dark' || value === 'light') {
			return value;
		}
	} catch {
		// localStorage unavailable (e.g. incognito with restricted storage)
	}
	return null;
};

export default defineContentScript({
	main() {
		const root = document.documentElement;
		const cachedMode = readCachedMode();
		const clearPendingTheme = () => {
			root.classList.remove(THEME_PENDING_CLASS);
		};

		if (cachedMode === null) {
			root.classList.add(THEME_PENDING_CLASS);
			window.setTimeout(clearPendingTheme, 1500);
		} else if (cachedMode === 'dark') {
			root.classList.add(DARK_MODE_CLASS);
			root.style.colorScheme = 'dark';
		}

		if (paths.info.includes(window.location.pathname)) {
			root.classList.add(INFO_PAGE_CLASS);
		}
	},
	matches: ['https://news.ycombinator.com/*'],
	runAt: 'document_start',
});
