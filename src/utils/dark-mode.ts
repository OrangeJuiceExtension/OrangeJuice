import '@/utils/dark-mode.css';
import lStorage from '@/utils/localStorage.ts';

const DARK_MODE_STORAGE_KEY = 'oj_dark_mode';
const DARK_MODE_CLASS = 'oj-dark-mode';

export type DarkModePreference = 'dark' | 'light';

export const getSystemPreference = (): DarkModePreference => {
	const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
	return darkModeMediaQuery.matches ? 'dark' : 'light';
};

const applyDarkMode = (mode: DarkModePreference) => {
	const root = document.documentElement;
	const head = document.head;

	if (!(root && head)) {
		return;
	}

	if (mode === 'dark') {
		root.classList.add(DARK_MODE_CLASS);
		root.style.colorScheme = 'dark';
	} else {
		root.classList.remove(DARK_MODE_CLASS);
		root.style.removeProperty('color-scheme');
	}
};

export const getDarkModePreference = async (): Promise<DarkModePreference> => {
	const stored = await lStorage.getItem<DarkModePreference>(DARK_MODE_STORAGE_KEY);
	if (stored) {
		return stored;
	}
	return getSystemPreference();
};

export const setDarkModePreference = async (mode: DarkModePreference) => {
	applyDarkMode(mode);
	await lStorage.setItem<DarkModePreference>(DARK_MODE_STORAGE_KEY, mode);
};

export const toggleDarkModePreference = async (): Promise<DarkModePreference> => {
	const current = await getDarkModePreference();
	const next = current === 'dark' ? 'light' : 'dark';
	await setDarkModePreference(next);
	return next;
};

export async function enableDarkMode() {
	applyDarkMode(await getDarkModePreference());
}
