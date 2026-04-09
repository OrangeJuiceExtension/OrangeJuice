import lStorage from '@/utils/local-storage.ts';

export const PREFERENCES_STORAGE_KEY = 'preferences';
export const ENABLE_FOCUS_BOX_STORAGE_KEY = 'enableFocusBox';
export const OPEN_STORY_NEW_TAB_STORAGE_KEY = 'openStoryNewTab';

export interface Preferences {
	enableFocusBox: boolean;
	openStoryNewTab: boolean;
}

const DEFAULT_PREFERENCES: Preferences = {
	enableFocusBox: true,
	openStoryNewTab: true,
};

const getDefaultPreferences = (): Preferences => ({
	...DEFAULT_PREFERENCES,
});

const isRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === 'object' && value !== null;
};

const parseStoredPreferences = (stored: string): Partial<Preferences> | null => {
	try {
		const parsed: unknown = JSON.parse(stored);
		if (!isRecord(parsed)) {
			return null;
		}

		const preferences: Partial<Preferences> = {};
		if (typeof parsed[ENABLE_FOCUS_BOX_STORAGE_KEY] === 'boolean') {
			preferences.enableFocusBox = parsed[ENABLE_FOCUS_BOX_STORAGE_KEY];
		}
		if (typeof parsed[OPEN_STORY_NEW_TAB_STORAGE_KEY] === 'boolean') {
			preferences.openStoryNewTab = parsed[OPEN_STORY_NEW_TAB_STORAGE_KEY];
		}

		return preferences;
	} catch {
		return null;
	}
};

const mergePreferences = (stored: Partial<Preferences>): Preferences => {
	return {
		...DEFAULT_PREFERENCES,
		...stored,
	};
};

const hasAllPreferences = (preferences: Partial<Preferences>): preferences is Preferences => {
	return (
		typeof preferences.enableFocusBox === 'boolean' &&
		typeof preferences.openStoryNewTab === 'boolean'
	);
};

const persistPreferences = async (preferences: Preferences): Promise<void> => {
	await lStorage.setItem<string>(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
};

const getLegacyPreferences = async (): Promise<Partial<Preferences>> => {
	const [enableFocusBox, openStoryNewTab] = await Promise.all([
		lStorage.getItem<boolean>(ENABLE_FOCUS_BOX_STORAGE_KEY),
		lStorage.getItem<boolean>(OPEN_STORY_NEW_TAB_STORAGE_KEY),
	]);

	const preferences: Partial<Preferences> = {};
	if (typeof enableFocusBox === 'boolean') {
		preferences.enableFocusBox = enableFocusBox;
	}
	if (typeof openStoryNewTab === 'boolean') {
		preferences.openStoryNewTab = openStoryNewTab;
	}

	return preferences;
};

const clearLegacyPreferences = async (): Promise<void> => {
	await Promise.all([
		lStorage.setItem<boolean>(ENABLE_FOCUS_BOX_STORAGE_KEY, null),
		lStorage.setItem<boolean>(OPEN_STORY_NEW_TAB_STORAGE_KEY, null),
	]);
};

const getPreferences = async (): Promise<Preferences> => {
	const stored = await lStorage.getItem<string>(PREFERENCES_STORAGE_KEY);
	if (typeof stored === 'string') {
		const parsedPreferences = parseStoredPreferences(stored);
		if (parsedPreferences) {
			const preferences = mergePreferences(parsedPreferences);
			if (!hasAllPreferences(parsedPreferences)) {
				await persistPreferences(preferences);
			}
			return preferences;
		}
	}

	const legacyPreferences = await getLegacyPreferences();
	if (Object.keys(legacyPreferences).length > 0) {
		const preferences = mergePreferences(legacyPreferences);
		await persistPreferences(preferences);
		await clearLegacyPreferences();
		return preferences;
	}

	const preferences = getDefaultPreferences();
	if (typeof stored === 'string') {
		await persistPreferences(preferences);
	}
	return preferences;
};

const setPreference = async <K extends keyof Preferences>(
	key: K,
	value: Preferences[K]
): Promise<void> => {
	const preferences = await getPreferences();
	await persistPreferences({
		...preferences,
		[key]: value,
	});
};

export const getEnableFocusBoxPreference = async (): Promise<boolean> => {
	const preferences = await getPreferences();
	return preferences.enableFocusBox;
};

export const setEnableFocusBoxPreference = async (enabled: boolean): Promise<void> => {
	await setPreference('enableFocusBox', enabled);
};

export const getOpenStoryNewTabPreference = async (): Promise<boolean> => {
	const preferences = await getPreferences();
	return preferences.openStoryNewTab;
};

export const setOpenStoryNewTabPreference = async (enabled: boolean): Promise<void> => {
	await setPreference('openStoryNewTab', enabled);
};
