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
	config: KeyboardCommandConfig = keyboardCommands
): KeyboardCommand | undefined =>
	config[group].find((command) =>
		command.bindings.some(
			({ key, modifierMode = 'any' }) =>
				event.key === key && matchesModifierMode(event, modifierMode)
		)
	);
