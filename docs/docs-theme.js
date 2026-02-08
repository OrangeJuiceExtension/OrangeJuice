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

	const iconMarkup = (isDark) => {
		if (isDark) {
			return `
				<svg class="oj-dark-mode-icon oj-dark-mode-icon--moon" aria-hidden="true" viewBox="0 0 24 24">
					<path d="M21.752 15.002A9.718 9.718 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.599.748-3.752A9.753 9.753 0 0 0 2.25 11.25c0 5.385 4.365 9.75 9.75 9.75a9.753 9.753 0 0 0 9.752-5.998Z" />
				</svg>
			`;
		}

		return `
			<svg class="oj-dark-mode-icon oj-dark-mode-icon--sun" aria-hidden="true" viewBox="0 0 24 24">
				<path d="M12 6.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z" />
				<path d="M12 2.5v2.25M12 19.25v2.25M4.75 12H2.5M21.5 12h-2.25M5.47 5.47 3.88 3.88M20.12 20.12l-1.59-1.59M18.53 5.47l1.59-1.59M3.88 20.12l1.59-1.59" />
			</svg>
		`;
	};

	const updateToggle = (button) => {
		const isDark = root.classList.contains('oj-dark-mode');
		button.innerHTML = iconMarkup(isDark);
		button.setAttribute('data-mode', isDark ? 'dark' : 'light');
		button.setAttribute('aria-pressed', isDark ? 'true' : 'false');
		button.title = isDark ? 'Click to turn dark mode off' : 'Click to turn dark mode on';
	};

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

		updateToggle(toggle);
		toggle.addEventListener('click', () => {
			const isDark = !root.classList.contains('oj-dark-mode');
			applyThemeClass(isDark);
			writeTheme(isDark);
			updateToggle(toggle);
		});
	};

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initTopbar, { once: true });
	} else {
		initTopbar();
	}
})();
