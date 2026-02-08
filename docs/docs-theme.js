const REG = /\/+$/;
const STORAGE_KEY = 'oj_docs_dark_mode';

(() => {
	const root = document.documentElement;

	const readStoredTheme = () => {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored === null) {
				return null;
			}
			return stored === '1';
		} catch {
			return null;
		}
	};

	const readSystemTheme = () =>
		window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false;

	const writeTheme = (isDark) => {
		try {
			localStorage.setItem(STORAGE_KEY, isDark ? '1' : '0');
		} catch {
			// Ignore storage failures.
		}
	};

	const applyThemeClass = (isDark) => {
		root.classList.toggle('oj-dark-mode', isDark);
	};

	const storedTheme = readStoredTheme();
	applyThemeClass(storedTheme ?? readSystemTheme());

	const getCurrentPage = () => {
		const path = window.location.pathname.replace(REG, '');
		if (path.endsWith('/privacy.html') || path.endsWith('/privacy')) {
			return 'privacy';
		}
		if (path.endsWith('/terms.html') || path.endsWith('/terms')) {
			return 'terms';
		}
		return 'home';
	};

	const syncToggleLabel = (button) => {
		button.textContent = root.classList.contains('oj-dark-mode') ? 'Light mode' : 'Dark mode';
	};

	const initTopbar = () => {
		const currentPage = getCurrentPage();
		for (const link of document.querySelectorAll('.oj-docs-nav__link')) {
			if (!(link instanceof HTMLAnchorElement)) {
				continue;
			}
			const href = link.getAttribute('href') ?? '';
			const isActive =
				(currentPage === 'home' && href.includes('index')) ||
				(currentPage === 'privacy' && href.includes('privacy')) ||
				(currentPage === 'terms' && href.includes('terms'));
			link.classList.toggle('is-active', isActive);
		}

		const toggle = document.querySelector('.oj-docs-theme-toggle');
		if (!(toggle instanceof HTMLButtonElement)) {
			return;
		}

		syncToggleLabel(toggle);
		toggle.addEventListener('click', () => {
			const isDark = !root.classList.contains('oj-dark-mode');
			applyThemeClass(isDark);
			writeTheme(isDark);
			syncToggleLabel(toggle);
		});
	};

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initTopbar, { once: true });
	} else {
		initTopbar();
	}
})();
