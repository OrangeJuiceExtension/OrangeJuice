import { beforeEach, describe, expect, it, vi } from 'vitest';
import lStorage from '@/utils/local-storage.ts';
import {
	ENABLE_FOCUS_BOX_STORAGE_KEY,
	getEnableFocusBoxPreference,
	getOpenStoryNewTabPreference,
	getShowHiddenStoriesOptionPreference,
	OPEN_STORY_NEW_TAB_STORAGE_KEY,
	PREFERENCES_STORAGE_KEY,
	setEnableFocusBoxPreference,
	setOpenStoryNewTabPreference,
	setShowHiddenStoriesOptionPreference,
} from './preferences.ts';

vi.mock('@/utils/local-storage.ts', () => ({
	default: {
		getItem: vi.fn(async () => null),
		setItem: vi.fn(async () => {}),
	},
}));

type StorageValue = boolean | string | null;

const toStorageValue = (value: unknown): StorageValue => {
	if (typeof value === 'boolean' || typeof value === 'string' || value === null) {
		return value;
	}
	return null;
};

const mockStorage = (values: Partial<Record<string, StorageValue>>): void => {
	const entries = Object.entries(values).filter(
		(entry): entry is [string, StorageValue] => entry[1] !== undefined
	);
	const state = new Map<string, StorageValue>(entries);

	vi.mocked(lStorage.getItem).mockImplementation((key: string) => {
		return Promise.resolve(state.get(key) ?? null);
	});

	vi.mocked(lStorage.setItem).mockImplementation((key: string, value: unknown) => {
		state.set(key, toStorageValue(value));
		return Promise.resolve();
	});
};

describe('preferences', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockStorage({});
	});

	describe('getters', () => {
		it.each([
			{
				name: 'returns the default focus box preference when no stored preferences exist',
				storedValues: {},
				reader: () => getEnableFocusBoxPreference(),
				expectedValue: true,
				expectedSetCalls: [
					[
						PREFERENCES_STORAGE_KEY,
						JSON.stringify({
							enableFocusBox: true,
							openStoryNewTab: true,
							showHiddenStoriesOption: true,
						}),
					],
				],
			},
			{
				name: 'reads the open story preference from the json body',
				storedValues: {
					[PREFERENCES_STORAGE_KEY]: JSON.stringify({
						enableFocusBox: false,
						openStoryNewTab: true,
						showHiddenStoriesOption: false,
					}),
				},
				reader: () => getOpenStoryNewTabPreference(),
				expectedValue: true,
				expectedSetCalls: [],
			},
			{
				name: 'migrates the legacy focus box preference into the json body',
				storedValues: {
					[ENABLE_FOCUS_BOX_STORAGE_KEY]: false,
					[OPEN_STORY_NEW_TAB_STORAGE_KEY]: true,
				},
				reader: () => getEnableFocusBoxPreference(),
				expectedValue: false,
				expectedSetCalls: [
					[
						PREFERENCES_STORAGE_KEY,
						JSON.stringify({
							enableFocusBox: false,
							openStoryNewTab: true,
							showHiddenStoriesOption: true,
						}),
					],
					[ENABLE_FOCUS_BOX_STORAGE_KEY, null],
					[OPEN_STORY_NEW_TAB_STORAGE_KEY, null],
				],
			},
			{
				name: 'repairs invalid json to default focus box preferences',
				storedValues: {
					[PREFERENCES_STORAGE_KEY]: '{bad json',
				},
				reader: () => getEnableFocusBoxPreference(),
				expectedValue: true,
				expectedSetCalls: [
					[
						PREFERENCES_STORAGE_KEY,
						JSON.stringify({
							enableFocusBox: true,
							openStoryNewTab: true,
							showHiddenStoriesOption: true,
						}),
					],
				],
			},
			{
				name: 'reads the show hidden stories option from the json body',
				storedValues: {
					[PREFERENCES_STORAGE_KEY]: JSON.stringify({
						enableFocusBox: true,
						openStoryNewTab: true,
						showHiddenStoriesOption: false,
					}),
				},
				reader: () => getShowHiddenStoriesOptionPreference(),
				expectedValue: false,
				expectedSetCalls: [],
			},
		])('$name', async ({ storedValues, reader, expectedValue, expectedSetCalls }) => {
			mockStorage(storedValues);

			await expect(reader()).resolves.toBe(expectedValue);
			expect(vi.mocked(lStorage.setItem).mock.calls).toEqual(expectedSetCalls);
		});

		it('fills missing keys from defaults and rewrites the json body', async () => {
			mockStorage({
				[PREFERENCES_STORAGE_KEY]: JSON.stringify({
					enableFocusBox: false,
					showHiddenStoriesOption: true,
				}),
			});

			await expect(getOpenStoryNewTabPreference()).resolves.toBe(true);

			expect(lStorage.setItem).toHaveBeenCalledWith(
				PREFERENCES_STORAGE_KEY,
				JSON.stringify({
					enableFocusBox: false,
					openStoryNewTab: true,
					showHiddenStoriesOption: true,
				})
			);
		});
	});

	describe('setters', () => {
		it.each([
			{
				name: 'updates enableFocusBox in the json body',
				action: () => setEnableFocusBoxPreference(false),
				expectedJson: JSON.stringify({
					enableFocusBox: false,
					openStoryNewTab: true,
					showHiddenStoriesOption: true,
				}),
			},
			{
				name: 'updates openStoryNewTab in the json body',
				action: () => setOpenStoryNewTabPreference(false),
				expectedJson: JSON.stringify({
					enableFocusBox: true,
					openStoryNewTab: false,
					showHiddenStoriesOption: true,
				}),
			},
			{
				name: 'updates showHiddenStoriesOption in the json body',
				action: () => setShowHiddenStoriesOptionPreference(false),
				expectedJson: JSON.stringify({
					enableFocusBox: true,
					openStoryNewTab: true,
					showHiddenStoriesOption: false,
				}),
			},
		])('$name', async ({ action, expectedJson }) => {
			mockStorage({
				[PREFERENCES_STORAGE_KEY]: JSON.stringify({
					enableFocusBox: true,
					openStoryNewTab: true,
					showHiddenStoriesOption: true,
				}),
			});

			await action();

			expect(lStorage.setItem).toHaveBeenCalledWith(PREFERENCES_STORAGE_KEY, expectedJson);
		});
	});
});
