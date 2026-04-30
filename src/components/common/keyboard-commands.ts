import lStorage from '@/utils/local-storage.ts';

export type KeyboardCommandGroup = 'navigation' | 'stories' | 'comments';

type KeyboardModifierMode = 'anyCombo' | 'none' | 'noneExceptShift' | 'any';

export interface KeyboardCommandBinding {
	key: string;
	modifierMode?: KeyboardModifierMode;
}

export interface KeyboardCommand {
	bindings: readonly KeyboardCommandBinding[];
	description: string;
	displayKey: string;
	group: KeyboardCommandGroup;
	id: string;
	showInHelp?: boolean;
}

export type KeyboardCommandConfig = Record<KeyboardCommandGroup, readonly KeyboardCommand[]>;

export const KEYBOARD_COMMANDS_STORAGE_KEY = 'oj_keyboard_commands';

const keyboardCommandGroups = ['navigation', 'stories', 'comments'] as const;
const keyboardModifierModes = ['anyCombo', 'none', 'noneExceptShift', 'any'] as const;

const numberBindings = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((key) => ({
	key,
	modifierMode: 'none',
})) satisfies KeyboardCommandBinding[];

export const keyboardCommands = {
	navigation: [
		{
			id: 'go-home',
			group: 'navigation',
			bindings: [{ key: 'Ó' }],
			displayKey: 'Alt/⌥ + H',
			description: 'Home',
		},
		{
			id: 'go-submit',
			group: 'navigation',
			bindings: [{ key: 'Í' }],
			displayKey: 'Alt/⌥ + S',
			description: 'Submit',
		},
		{
			id: 'go-show',
			group: 'navigation',
			bindings: [{ key: 'Ø' }],
			displayKey: 'Alt/⌥ + O',
			description: 'Show',
		},
		{
			id: 'go-ask',
			group: 'navigation',
			bindings: [{ key: 'Å' }],
			displayKey: 'Alt/⌥ + A',
			description: 'Ask',
		},
		{
			id: 'go-new',
			group: 'navigation',
			bindings: [{ key: '˜' }],
			displayKey: 'Alt/⌥ + N',
			description: 'New',
		},
		{
			id: 'go-profile',
			group: 'navigation',
			bindings: [{ key: '∏' }],
			displayKey: 'Alt/⌥ + P',
			description: 'Profile',
		},
		{
			id: 'go-threads',
			group: 'navigation',
			bindings: [{ key: 'ˇ' }],
			displayKey: 'Alt/⌥ + T',
			description: 'Threads',
		},
		{
			id: 'show-help',
			group: 'navigation',
			bindings: [{ key: '?', modifierMode: 'anyCombo' }],
			displayKey: '?',
			description: 'Show help dialog',
		},
		{
			id: 'hide-help',
			group: 'navigation',
			bindings: [{ key: 'Escape' }, { key: 'escape' }],
			displayKey: 'esc',
			description: 'Hide help dialog',
		},
	],
	stories: [
		{
			id: 'move-down',
			group: 'stories',
			bindings: [{ key: 'ArrowDown' }, { key: 'j' }, { key: 'J' }],
			displayKey: '↑ / ↓',
			description: 'Move up / down',
		},
		{
			id: 'move-up',
			group: 'stories',
			bindings: [{ key: 'ArrowUp' }, { key: 'k' }, { key: 'K' }],
			displayKey: 'j / k',
			description: 'Move down / up',
		},
		{
			id: 'open-comments-new-tab',
			group: 'stories',
			bindings: [{ key: 'ArrowLeft', modifierMode: 'none' }],
			displayKey: '←',
			description: 'Open story comments (new tab)',
		},
		{
			id: 'open-comments',
			group: 'stories',
			bindings: [{ key: 'ArrowLeft', modifierMode: 'noneExceptShift' }],
			displayKey: '⇧ + ←',
			description: 'Open story comments',
		},
		{
			id: 'open-story-new-tab',
			group: 'stories',
			bindings: [{ key: 'ArrowRight', modifierMode: 'none' }],
			displayKey: '→',
			description: 'Open story url (new tab)',
		},
		{
			id: 'open-story',
			group: 'stories',
			bindings: [{ key: 'ArrowRight', modifierMode: 'noneExceptShift' }],
			displayKey: '⇧ + →',
			description: 'Open story url',
		},
		{
			id: 'open-selected',
			group: 'stories',
			bindings: [{ key: 'Enter', modifierMode: 'none' }],
			displayKey: 'Enter',
			description: 'Open selected story in new tab',
		},
		{
			id: 'open-with-comments',
			group: 'stories',
			bindings: [{ key: 'O', modifierMode: 'anyCombo' }],
			displayKey: 'O',
			description: 'Open story and comments in new tabs',
		},
		{
			id: 'upvote',
			group: 'stories',
			bindings: [{ key: 'u', modifierMode: 'none' }],
			displayKey: 'u',
			description: 'Upvote selected story',
		},
		{
			id: 'favorite',
			group: 'stories',
			bindings: [{ key: 'f', modifierMode: 'none' }],
			displayKey: 'f',
			description: 'Favorite selected story',
		},
		{
			id: 'copy-hn-url',
			group: 'stories',
			bindings: [{ key: 'y', modifierMode: 'none' }],
			displayKey: 'y',
			description: 'Copy selected story HN link',
		},
		{
			id: 'flag',
			group: 'stories',
			bindings: [{ key: 'X', modifierMode: 'none' }],
			displayKey: 'X',
			description: 'Flag selected story',
		},
		{
			id: 'reply',
			group: 'stories',
			bindings: [{ key: 'r', modifierMode: 'none' }],
			displayKey: 'r',
			description: 'Reply to story (go to comments)',
		},
		{
			id: 'open-position',
			group: 'stories',
			bindings: numberBindings,
			displayKey: '1-9, 0',
			description: 'Open story at position 1-10',
		},
		{
			id: 'more',
			group: 'stories',
			bindings: [{ key: 'm', modifierMode: 'none' }],
			displayKey: 'm',
			description: 'Click more link',
		},
		{
			id: 'back',
			group: 'stories',
			bindings: [{ key: 'b', modifierMode: 'none' }],
			displayKey: 'b',
			description: 'Go back (if paginated)',
		},
		{
			id: 'toggle-hide-read',
			group: 'stories',
			bindings: [{ key: 'h', modifierMode: 'none' }],
			displayKey: 'h',
			description: 'Toggle hide read stories checkbox',
		},
		{
			id: 'hide-read-now',
			group: 'stories',
			bindings: [{ key: 'H', modifierMode: 'anyCombo' }],
			displayKey: 'H',
			description: 'Hide read stories',
		},
		{
			id: 'escape',
			group: 'stories',
			bindings: [{ key: 'Escape' }],
			displayKey: 'esc',
			description: 'Unfocus story',
		},
	],
	comments: [
		{
			id: 'move-down',
			group: 'comments',
			bindings: [{ key: 'j', modifierMode: 'none' }],
			displayKey: 'j / J',
			description: 'Move down by one / jump to same or higher-level comment',
		},
		{
			id: 'move-up',
			group: 'comments',
			bindings: [{ key: 'k', modifierMode: 'none' }],
			displayKey: 'k / K',
			description: 'Move up by one / jump to same or higher-level comment',
		},
		{
			id: 'move-down-same-or-higher-indent',
			group: 'comments',
			bindings: [{ key: 'J', modifierMode: 'noneExceptShift' }],
			displayKey: 'J',
			description: 'Jump to same or higher-level comment',
			showInHelp: false,
		},
		{
			id: 'move-up-same-or-higher-indent',
			group: 'comments',
			bindings: [{ key: 'K', modifierMode: 'noneExceptShift' }],
			displayKey: 'K',
			description: 'Jump to same or higher-level comment',
			showInHelp: false,
		},
		{
			id: 'move-down-expand',
			group: 'comments',
			bindings: [{ key: 'n', modifierMode: 'noneExceptShift' }],
			displayKey: 'n / p',
			description: 'Move down / up and expand collapsed comments',
		},
		{
			id: 'move-up-expand',
			group: 'comments',
			bindings: [{ key: 'p', modifierMode: 'noneExceptShift' }],
			displayKey: 'p',
			description: 'Move up and expand collapsed comments',
			showInHelp: false,
		},
		{
			id: 'move-down-same-indent',
			group: 'comments',
			bindings: [{ key: 'N', modifierMode: 'noneExceptShift' }],
			displayKey: 'N / P',
			description: 'Move down / up at same indent level',
		},
		{
			id: 'move-up-same-indent',
			group: 'comments',
			bindings: [{ key: 'P', modifierMode: 'noneExceptShift' }],
			displayKey: 'P',
			description: 'Move up at same indent level',
			showInHelp: false,
		},
		{
			id: 'collapse-toggle',
			group: 'comments',
			bindings: [{ key: 'c', modifierMode: 'none' }],
			displayKey: 'c',
			description: 'Collapse/expand comment',
		},
		{
			id: 'collapse-root',
			group: 'comments',
			bindings: [{ key: 'C', modifierMode: 'noneExceptShift' }],
			displayKey: 'C',
			description: 'Collapse root of selected comment',
		},
		{
			id: 'reply',
			group: 'comments',
			bindings: [{ key: 'r', modifierMode: 'none' }],
			displayKey: 'r',
			description: 'Reply to selected comment',
		},
		{
			id: 'upvote',
			group: 'comments',
			bindings: [{ key: 'u', modifierMode: 'none' }],
			displayKey: 'u',
			description: 'Upvote selected comment',
		},
		{
			id: 'downvote',
			group: 'comments',
			bindings: [{ key: 'd', modifierMode: 'none' }],
			displayKey: 'd',
			description: 'Downvote selected comment',
		},
		{
			id: 'favorite',
			group: 'comments',
			bindings: [{ key: 'f', modifierMode: 'none' }],
			displayKey: 'f',
			description: 'Favorite selected comment',
		},
		{
			id: 'copy-hn-url',
			group: 'comments',
			bindings: [{ key: 'y', modifierMode: 'none' }],
			displayKey: 'y',
			description: 'Copy selected comment HN link',
		},
		{
			id: 'flag',
			group: 'comments',
			bindings: [{ key: 'X', modifierMode: 'anyCombo' }],
			displayKey: 'X',
			description: 'Flag selected comment',
		},
		{
			id: 'open-reference-link',
			group: 'comments',
			bindings: numberBindings,
			displayKey: '0-9',
			description: 'Open reference link by number',
		},
		{
			id: 'scroll-active-to-top',
			group: 'comments',
			bindings: [{ key: 'z', modifierMode: 'none' }],
			displayKey: 'z',
			description: 'Scroll selected comment to top of window',
		},
		{
			id: 'scroll-page-to-top',
			group: 'comments',
			bindings: [{ key: 't', modifierMode: 'none' }],
			displayKey: 't',
			description: 'Scroll to top of page',
		},
		{
			id: 'back',
			group: 'comments',
			bindings: [{ key: 'b', modifierMode: 'none' }],
			displayKey: 'b',
			description: 'Go back (if paginated)',
		},
		{
			id: 'escape',
			group: 'comments',
			bindings: [
				{ key: 'Escape', modifierMode: 'none' },
				{ key: 'escape', modifierMode: 'none' },
			],
			displayKey: 'esc',
			description: 'Unfocus comment or close reply box',
		},
	],
} as const satisfies KeyboardCommandConfig;

let activeKeyboardCommands: KeyboardCommandConfig = keyboardCommands;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const isKeyboardCommandGroup = (value: unknown): value is KeyboardCommandGroup =>
	typeof value === 'string' && keyboardCommandGroups.includes(value as KeyboardCommandGroup);

const isKeyboardModifierMode = (value: unknown): value is KeyboardModifierMode =>
	typeof value === 'string' && keyboardModifierModes.includes(value as KeyboardModifierMode);

const validateBindings = (
	value: unknown,
	group: KeyboardCommandGroup,
	commandId: string
): KeyboardCommandBinding[] => {
	if (!Array.isArray(value)) {
		throw new Error(`${group}.${commandId}.bindings must be an array.`);
	}

	return value.map((binding, index) => {
		if (!isRecord(binding)) {
			throw new Error(`${group}.${commandId}.bindings[${index}] must be an object.`);
		}
		const { key, modifierMode } = binding;
		if (typeof key !== 'string' || key.length === 0) {
			throw new Error(`${group}.${commandId}.bindings[${index}].key must be a string.`);
		}
		if (modifierMode !== undefined && !isKeyboardModifierMode(modifierMode)) {
			throw new Error(
				`${group}.${commandId}.bindings[${index}].modifierMode must be one of ${keyboardModifierModes.join(', ')}.`
			);
		}
		return modifierMode === undefined ? { key } : { key, modifierMode };
	});
};

const validateCommand = (
	value: unknown,
	defaultCommand: KeyboardCommand,
	group: KeyboardCommandGroup
): KeyboardCommand => {
	if (!isRecord(value)) {
		throw new Error(`${group}.${defaultCommand.id} must be an object.`);
	}

	const { id, description, displayKey, showInHelp } = value;
	if (id !== defaultCommand.id) {
		throw new Error(`${group}.${defaultCommand.id}.id must remain "${defaultCommand.id}".`);
	}
	if (value.group !== group) {
		throw new Error(`${group}.${defaultCommand.id}.group must remain "${group}".`);
	}
	if (typeof description !== 'string') {
		throw new Error(`${group}.${defaultCommand.id}.description must be a string.`);
	}
	if (typeof displayKey !== 'string') {
		throw new Error(`${group}.${defaultCommand.id}.displayKey must be a string.`);
	}
	if (showInHelp !== undefined && typeof showInHelp !== 'boolean') {
		throw new Error(`${group}.${defaultCommand.id}.showInHelp must be a boolean.`);
	}

	return {
		bindings: validateBindings(value.bindings, group, defaultCommand.id),
		description,
		displayKey,
		group,
		id: defaultCommand.id,
		...(showInHelp === undefined ? {} : { showInHelp }),
	};
};

export const parseKeyboardCommandConfig = (json: string): KeyboardCommandConfig => {
	let parsed: unknown;
	try {
		parsed = JSON.parse(json);
	} catch {
		throw new Error('Shortcut JSON could not be parsed.');
	}

	if (!isRecord(parsed)) {
		throw new Error('Shortcut JSON must be an object.');
	}

	const config = {} as Record<KeyboardCommandGroup, KeyboardCommand[]>;
	for (const group of keyboardCommandGroups) {
		const commands = parsed[group];
		const defaultCommands = keyboardCommands[group];
		if (!Array.isArray(commands)) {
			throw new Error(`${group} must be an array.`);
		}
		if (commands.length !== defaultCommands.length) {
			throw new Error(`${group} must contain ${defaultCommands.length} commands.`);
		}
		config[group] = commands.map((command, index) =>
			validateCommand(command, defaultCommands[index], group)
		);
	}

	for (const key of Object.keys(parsed)) {
		if (!isKeyboardCommandGroup(key)) {
			throw new Error(`${key} is not a supported shortcut group.`);
		}
	}

	return config;
};

export const serializeKeyboardCommandConfig = (
	config: KeyboardCommandConfig = activeKeyboardCommands
): string => JSON.stringify(config, null, 2);

export const getKeyboardCommandConfig = (): KeyboardCommandConfig => activeKeyboardCommands;

export const loadKeyboardCommandConfig = async (): Promise<KeyboardCommandConfig> => {
	const stored = await lStorage.getItem<string>(KEYBOARD_COMMANDS_STORAGE_KEY);
	if (typeof stored !== 'string') {
		activeKeyboardCommands = keyboardCommands;
		return activeKeyboardCommands;
	}

	try {
		activeKeyboardCommands = parseKeyboardCommandConfig(stored);
	} catch {
		activeKeyboardCommands = keyboardCommands;
	}
	return activeKeyboardCommands;
};

export const saveKeyboardCommandConfig = async (json: string): Promise<KeyboardCommandConfig> => {
	const config = parseKeyboardCommandConfig(json);
	await lStorage.setItem(KEYBOARD_COMMANDS_STORAGE_KEY, serializeKeyboardCommandConfig(config));
	activeKeyboardCommands = config;
	return activeKeyboardCommands;
};

const matchesModifierMode = (event: KeyboardEvent, modifierMode: KeyboardModifierMode): boolean => {
	const hasCombo = event.ctrlKey || event.metaKey || event.shiftKey || event.altKey;
	const hasNonShiftCombo = event.ctrlKey || event.metaKey || event.altKey;

	switch (modifierMode) {
		case 'any':
			return true;
		case 'anyCombo':
			return hasCombo;
		case 'none':
			return !hasCombo;
		case 'noneExceptShift':
			return !hasNonShiftCombo;
		default:
			return false;
	}
};

export const getKeyboardCommand = (
	group: KeyboardCommandGroup,
	event: KeyboardEvent,
	config: KeyboardCommandConfig = activeKeyboardCommands
): KeyboardCommand | undefined =>
	config[group].find((command) =>
		command.bindings.some(
			({ key, modifierMode = 'any' }) =>
				event.key === key && matchesModifierMode(event, modifierMode)
		)
	);
