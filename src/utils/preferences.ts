import lStorage from '@/utils/local-storage.ts';

export const ENABLE_FOCUS_BOX_STORAGE_KEY = 'enableFocusBox';
export const ENABLE_FOCUS_BOX_DEFAULT = true;
export const OPEN_STORY_NEW_TAB_STORAGE_KEY = 'openStoryNewTab';
export const OPEN_STORY_NEW_TAB_DEFAULT = true;

export const getEnableFocusBoxPreference = async (): Promise<boolean> => {
	const stored = await lStorage.getItem<boolean>(ENABLE_FOCUS_BOX_STORAGE_KEY, {
		fallback: ENABLE_FOCUS_BOX_DEFAULT,
	});
	return stored ?? ENABLE_FOCUS_BOX_DEFAULT;
};

export const setEnableFocusBoxPreference = async (enabled: boolean): Promise<void> => {
	await lStorage.setItem<boolean>(ENABLE_FOCUS_BOX_STORAGE_KEY, enabled);
};

export const getOpenStoryNewTabPreference = async (): Promise<boolean> => {
	const stored = await lStorage.getItem<boolean>(OPEN_STORY_NEW_TAB_STORAGE_KEY, {
		fallback: OPEN_STORY_NEW_TAB_DEFAULT,
	});
	return stored ?? OPEN_STORY_NEW_TAB_DEFAULT;
};

export const setOpenStoryNewTabPreference = async (enabled: boolean): Promise<void> => {
	await lStorage.setItem<boolean>(OPEN_STORY_NEW_TAB_STORAGE_KEY, enabled);
};
