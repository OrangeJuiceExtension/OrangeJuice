import { browser } from '#imports';
import './style.css';

const STORAGE_KEY = 'oj_welcome_dark_mode';
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const LOGO_PATH = '/icon/orange_juice_icon_128x128.png';

const createSvgIcon = (isDark: boolean): SVGSVGElement => {
	const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
	svg.setAttribute(
		'class',
		isDark
			? 'oj-dark-mode-icon oj-dark-mode-icon--moon'
			: 'oj-dark-mode-icon oj-dark-mode-icon--sun'
	);
	svg.setAttribute('aria-hidden', 'true');
	svg.setAttribute('viewBox', '0 0 24 24');

	const paths = isDark
		? [
				'M21.752 15.002A9.718 9.718 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.599.748-3.752A9.753 9.753 0 0 0 2.25 11.25c0 5.385 4.365 9.75 9.75 9.75a9.753 9.753 0 0 0 9.752-5.998Z',
			]
		: [
				'M12 6.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z',
				'M12 2.5v2.25M12 19.25v2.25M4.75 12H2.5M21.5 12h-2.25M5.47 5.47 3.88 3.88M20.12 20.12l-1.59-1.59M18.53 5.47l1.59-1.59M3.88 20.12l1.59-1.59',
			];

	for (const pathData of paths) {
		const path = document.createElementNS(SVG_NAMESPACE, 'path');
		path.setAttribute('d', pathData);
		svg.append(path);
	}

	return svg;
};

const readStoredTheme = (): boolean | null => {
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

const readSystemTheme = (): boolean =>
	window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false;

const applyThemeClass = (isDark: boolean): void => {
	document.documentElement.classList.toggle('oj-dark-mode', isDark);
};

const writeTheme = (isDark: boolean): void => {
	try {
		localStorage.setItem(STORAGE_KEY, isDark ? '1' : '0');
	} catch {
		// Ignore storage failures.
	}
};

const updateToggle = (button: HTMLButtonElement): void => {
	const isDark = document.documentElement.classList.contains('oj-dark-mode');
	button.replaceChildren(createSvgIcon(isDark));
	button.setAttribute('aria-pressed', isDark ? 'true' : 'false');
	button.title = isDark ? 'Click to turn dark mode off' : 'Click to turn dark mode on';
};

const initThemeToggle = (): void => {
	const toggle = document.querySelector('.oj-welcome-theme-toggle');
	if (!(toggle instanceof HTMLButtonElement)) {
		return;
	}

	const storedTheme = readStoredTheme();
	applyThemeClass(storedTheme ?? readSystemTheme());
	updateToggle(toggle);

	toggle.addEventListener('click', () => {
		const isDark = !document.documentElement.classList.contains('oj-dark-mode');
		applyThemeClass(isDark);
		writeTheme(isDark);
		updateToggle(toggle);
	});
};

const initLinks = (): void => {
	const logo = document.getElementById('oj-welcome-logo');
	if (logo instanceof HTMLImageElement) {
		logo.src = browser.runtime.getURL(LOGO_PATH);
	}
};

initThemeToggle();
initLinks();
