import type { core } from 'zod/mini';
import { array, boolean, config, literal, minLength, object, optional, string } from 'zod/mini';
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

config({ jitless: true });

const keyboardModifierModeSchema = literal(keyboardModifierModes);
const keyboardCommandGroupSchema = literal(keyboardCommandGroups);
const keyboardCommandBindingSchema = object({
	key: string().check(minLength(1)),
	modifierMode: optional(keyboardModifierModeSchema),
});
const keyboardCommandSchema = object({
	bindings: array(keyboardCommandBindingSchema),
	description: string(),
	displayKey: string(),
	group: keyboardCommandGroupSchema,
	id: string(),
	showInHelp: optional(boolean()),
});
const keyboardCommandConfigSchema = object({
	comments: array(keyboardCommandSchema),
	navigation: array(keyboardCommandSchema),
	stories: array(keyboardCommandSchema),
});

const numberBindings = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((key) => ({
	key,
	modifierMode: 'none',
})) satisfies KeyboardCommandBinding[];

export const keyboardCommands = {
	comments: [
		{
			bindings: [{ key: 'j', modifierMode: 'none' }],
			description: 'Move down by one / jump to same or higher-level comment',
			displayKey: 'j / J',
			group: 'comments',
			id: 'move-down',
		},
		{
			bindings: [{ key: 'k', modifierMode: 'none' }],
			description: 'Move up by one / jump to same or higher-level comment',
			displayKey: 'k / K',
			group: 'comments',
			id: 'move-up',
		},
		{
			bindings: [{ key: 'J', modifierMode: 'noneExceptShift' }],
			description: 'Jump to same or higher-level comment',
			displayKey: 'J',
			group: 'comments',
			id: 'move-down-same-or-higher-indent',
			showInHelp: false,
		},
		{
			bindings: [{ key: 'K', modifierMode: 'noneExceptShift' }],
			description: 'Jump to same or higher-level comment',
			displayKey: 'K',
			group: 'comments',
			id: 'move-up-same-or-higher-indent',
			showInHelp: false,
		},
		{
			bindings: [{ key: 'n', modifierMode: 'noneExceptShift' }],
			description: 'Move down / up and expand collapsed comments',
			displayKey: 'n / p',
			group: 'comments',
			id: 'move-down-expand',
		},
		{
			bindings: [{ key: 'p', modifierMode: 'noneExceptShift' }],
			description: 'Move up and expand collapsed comments',
			displayKey: 'p',
			group: 'comments',
			id: 'move-up-expand',
			showInHelp: false,
		},
		{
			bindings: [{ key: 'N', modifierMode: 'noneExceptShift' }],
			description: 'Move down / up at same indent level',
			displayKey: 'N / P',
			group: 'comments',
			id: 'move-down-same-indent',
		},
		{
			bindings: [{ key: 'P', modifierMode: 'noneExceptShift' }],
			description: 'Move up at same indent level',
			displayKey: 'P',
			group: 'comments',
			id: 'move-up-same-indent',
			showInHelp: false,
		},
		{
			bindings: [{ key: 'c', modifierMode: 'none' }],
			description: 'Collapse/expand comment',
			displayKey: 'c',
			group: 'comments',
			id: 'collapse-toggle',
		},
		{
			bindings: [{ key: 'C', modifierMode: 'noneExceptShift' }],
			description: 'Collapse root of selected comment',
			displayKey: 'C',
			group: 'comments',
			id: 'collapse-root',
		},
		{
			bindings: [{ key: 'r', modifierMode: 'none' }],
			description: 'Reply to selected comment',
			displayKey: 'r',
			group: 'comments',
			id: 'reply',
		},
		{
			bindings: [{ key: 'u', modifierMode: 'none' }],
			description: 'Upvote selected comment',
			displayKey: 'u',
			group: 'comments',
			id: 'upvote',
		},
		{
			bindings: [{ key: 'd', modifierMode: 'none' }],
			description: 'Downvote selected comment',
			displayKey: 'd',
			group: 'comments',
			id: 'downvote',
		},
		{
			bindings: [{ key: 'f', modifierMode: 'none' }],
			description: 'Favorite selected comment',
			displayKey: 'f',
			group: 'comments',
			id: 'favorite',
		},
		{
			bindings: [{ key: 'y', modifierMode: 'none' }],
			description: 'Copy selected comment HN link',
			displayKey: 'y',
			group: 'comments',
			id: 'copy-hn-url',
		},
		{
			bindings: [{ key: 'X', modifierMode: 'anyCombo' }],
			description: 'Flag selected comment',
			displayKey: 'X',
			group: 'comments',
			id: 'flag',
		},
		{
			bindings: numberBindings,
			description: 'Open reference link by number',
			displayKey: '0-9',
			group: 'comments',
			id: 'open-reference-link',
		},
		{
			bindings: [{ key: 'z', modifierMode: 'none' }],
			description: 'Scroll selected comment to top of window',
			displayKey: 'z',
			group: 'comments',
			id: 'scroll-active-to-top',
		},
		{
			bindings: [{ key: 't', modifierMode: 'none' }],
			description: 'Scroll to top of page',
			displayKey: 't',
			group: 'comments',
			id: 'scroll-page-to-top',
		},
		{
			bindings: [{ key: 'b', modifierMode: 'none' }],
			description: 'Go back (if paginated)',
			displayKey: 'b',
			group: 'comments',
			id: 'back',
		},
		{
			bindings: [
				{ key: 'Escape', modifierMode: 'none' },
				{ key: 'escape', modifierMode: 'none' },
			],
			description: 'Unfocus comment or close reply box',
			displayKey: 'esc',
			group: 'comments',
			id: 'escape',
		},
	],
	navigation: [
		{
			bindings: [{ key: 'Ó' }],
			description: 'Home',
			displayKey: 'Alt/⌥ + H',
			group: 'navigation',
			id: 'go-home',
		},
		{
			bindings: [{ key: 'Í' }],
			description: 'Submit',
			displayKey: 'Alt/⌥ + S',
			group: 'navigation',
			id: 'go-submit',
		},
		{
			bindings: [{ key: 'Ø' }],
			description: 'Show',
			displayKey: 'Alt/⌥ + O',
			group: 'navigation',
			id: 'go-show',
		},
		{
			bindings: [{ key: 'Å' }],
			description: 'Ask',
			displayKey: 'Alt/⌥ + A',
			group: 'navigation',
			id: 'go-ask',
		},
		{
			bindings: [{ key: '˜' }],
			description: 'New',
			displayKey: 'Alt/⌥ + N',
			group: 'navigation',
			id: 'go-new',
		},
		{
			bindings: [{ key: '∏' }],
			description: 'Profile',
			displayKey: 'Alt/⌥ + P',
			group: 'navigation',
			id: 'go-profile',
		},
		{
			bindings: [{ key: 'ˇ' }],
			description: 'Threads',
			displayKey: 'Alt/⌥ + T',
			group: 'navigation',
			id: 'go-threads',
		},
		{
			bindings: [{ key: '?', modifierMode: 'anyCombo' }],
			description: 'Show help dialog',
			displayKey: '?',
			group: 'navigation',
			id: 'show-help',
		},
		{
			bindings: [{ key: 'Escape' }, { key: 'escape' }],
			description: 'Hide help dialog',
			displayKey: 'esc',
			group: 'navigation',
			id: 'hide-help',
		},
	],
	stories: [
		{
			bindings: [{ key: 'ArrowDown' }, { key: 'j' }, { key: 'J' }],
			description: 'Move up / down',
			displayKey: '↑ / ↓',
			group: 'stories',
			id: 'move-down',
		},
		{
			bindings: [{ key: 'ArrowUp' }, { key: 'k' }, { key: 'K' }],
			description: 'Move down / up',
			displayKey: 'j / k',
			group: 'stories',
			id: 'move-up',
		},
		{
			bindings: [{ key: 'ArrowLeft', modifierMode: 'none' }],
			description: 'Open story comments (new tab)',
			displayKey: '←',
			group: 'stories',
			id: 'open-comments-new-tab',
		},
		{
			bindings: [{ key: 'ArrowLeft', modifierMode: 'noneExceptShift' }],
			description: 'Open story comments',
			displayKey: '⇧ + ←',
			group: 'stories',
			id: 'open-comments',
		},
		{
			bindings: [{ key: 'ArrowRight', modifierMode: 'none' }],
			description: 'Open story url (new tab)',
			displayKey: '→',
			group: 'stories',
			id: 'open-story-new-tab',
		},
		{
			bindings: [{ key: 'ArrowRight', modifierMode: 'noneExceptShift' }],
			description: 'Open story url',
			displayKey: '⇧ + →',
			group: 'stories',
			id: 'open-story',
		},
		{
			bindings: [{ key: 'Enter', modifierMode: 'none' }],
			description: 'Open selected story in new tab',
			displayKey: 'Enter',
			group: 'stories',
			id: 'open-selected',
		},
		{
			bindings: [{ key: 'O', modifierMode: 'anyCombo' }],
			description: 'Open story and comments in new tabs',
			displayKey: 'O',
			group: 'stories',
			id: 'open-with-comments',
		},
		{
			bindings: [{ key: 'u', modifierMode: 'none' }],
			description: 'Upvote selected story',
			displayKey: 'u',
			group: 'stories',
			id: 'upvote',
		},
		{
			bindings: [{ key: 'f', modifierMode: 'none' }],
			description: 'Favorite selected story',
			displayKey: 'f',
			group: 'stories',
			id: 'favorite',
		},
		{
			bindings: [{ key: 'y', modifierMode: 'none' }],
			description: 'Copy selected story HN link',
			displayKey: 'y',
			group: 'stories',
			id: 'copy-hn-url',
		},
		{
			bindings: [{ key: 'X', modifierMode: 'none' }],
			description: 'Flag selected story',
			displayKey: 'X',
			group: 'stories',
			id: 'flag',
		},
		{
			bindings: [{ key: 'r', modifierMode: 'none' }],
			description: 'Reply to story (go to comments)',
			displayKey: 'r',
			group: 'stories',
			id: 'reply',
		},
		{
			bindings: numberBindings,
			description: 'Open story at position 1-10',
			displayKey: '1-9, 0',
			group: 'stories',
			id: 'open-position',
		},
		{
			bindings: [{ key: 'm', modifierMode: 'none' }],
			description: 'Click more link',
			displayKey: 'm',
			group: 'stories',
			id: 'more',
		},
		{
			bindings: [{ key: 'b', modifierMode: 'none' }],
			description: 'Go back (if paginated)',
			displayKey: 'b',
			group: 'stories',
			id: 'back',
		},
		{
			bindings: [{ key: 'h', modifierMode: 'none' }],
			description: 'Toggle hide read stories checkbox',
			displayKey: 'h',
			group: 'stories',
			id: 'toggle-hide-read',
		},
		{
			bindings: [{ key: 'H', modifierMode: 'anyCombo' }],
			description: 'Hide read stories',
			displayKey: 'H',
			group: 'stories',
			id: 'hide-read-now',
		},
		{
			bindings: [{ key: 'Escape' }],
			description: 'Unfocus story',
			displayKey: 'esc',
			group: 'stories',
			id: 'escape',
		},
	],
} as const satisfies KeyboardCommandConfig;

let activeKeyboardCommands: KeyboardCommandConfig = keyboardCommands;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const isKeyboardCommandGroup = (value: unknown): value is KeyboardCommandGroup =>
	typeof value === 'string' && keyboardCommandGroups.includes(value as KeyboardCommandGroup);

const formatZodIssuePath = (path: readonly PropertyKey[]): string => {
	if (path.length === 0) {
		return 'Shortcut JSON';
	}

	let formatted = '';
	for (const part of path) {
		if (typeof part === 'number') {
			formatted = `${formatted}[${part}]`;
			continue;
		}
		formatted = formatted ? `${formatted}.${String(part)}` : String(part);
	}
	return formatted;
};

const formatZodIssue = (issue: core.$ZodIssue): string => {
	const path = formatZodIssuePath(issue.path);
	if (issue.code === 'invalid_type' && 'expected' in issue) {
		return `${path} must be a ${String(issue.expected)}.`;
	}
	if (issue.code === 'invalid_value' && 'values' in issue) {
		return `${path} must be one of ${issue.values.map(String).join(', ')}.`;
	}
	if (issue.code === 'too_small') {
		return `${path} must not be empty.`;
	}
	return `${path}: ${issue.message}`;
};

const validateCommand = (
	command: KeyboardCommand,
	defaultCommand: KeyboardCommand,
	group: KeyboardCommandGroup
): KeyboardCommand => {
	const { bindings, id, description, displayKey, showInHelp } = command;
	if (id !== defaultCommand.id) {
		throw new Error(`${group}.${defaultCommand.id}.id must remain "${defaultCommand.id}".`);
	}
	if (command.group !== group) {
		throw new Error(`${group}.${defaultCommand.id}.group must remain "${group}".`);
	}

	return {
		bindings,
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
	} catch (error) {
		throw new Error('Shortcut JSON could not be parsed.', { cause: error });
	}

	if (!isRecord(parsed)) {
		throw new Error('Shortcut JSON must be an object.');
	}

	const result = keyboardCommandConfigSchema.safeParse(parsed, { jitless: true });
	if (!result.success) {
		throw new Error(formatZodIssue(result.error.issues[0]));
	}

	const parsedConfig = {} as Record<KeyboardCommandGroup, KeyboardCommand[]>;
	for (const group of keyboardCommandGroups) {
		const commands = result.data[group];
		const defaultCommands = keyboardCommands[group];
		if (commands.length !== defaultCommands.length) {
			throw new Error(`${group} must contain ${defaultCommands.length} commands.`);
		}
		parsedConfig[group] = commands.map((command, index) =>
			validateCommand(command, defaultCommands[index], group)
		);
	}

	for (const key of Object.keys(parsed)) {
		if (!isKeyboardCommandGroup(key)) {
			throw new Error(`${key} is not a supported shortcut group.`);
		}
	}

	return parsedConfig;
};

export const serializeKeyboardCommandConfig = (
	commandConfig: KeyboardCommandConfig = activeKeyboardCommands
): string => JSON.stringify(commandConfig, null, 2);

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
	const commandConfig = parseKeyboardCommandConfig(json);
	await lStorage.setItem(
		KEYBOARD_COMMANDS_STORAGE_KEY,
		serializeKeyboardCommandConfig(commandConfig)
	);
	activeKeyboardCommands = commandConfig;
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
	commandConfig: KeyboardCommandConfig = activeKeyboardCommands
): KeyboardCommand | undefined =>
	commandConfig[group].find((command) =>
		command.bindings.some(
			({ key, modifierMode = 'any' }) =>
				event.key === key && matchesModifierMode(event, modifierMode)
		)
	);
