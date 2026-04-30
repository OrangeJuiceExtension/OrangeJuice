import { beforeEach, describe, expect, it } from 'vitest';
import {
	getKeyboardCommand,
	KEYBOARD_COMMANDS_STORAGE_KEY,
	keyboardCommands,
	loadKeyboardCommandConfig,
	parseKeyboardCommandConfig,
	saveKeyboardCommandConfig,
	serializeKeyboardCommandConfig,
} from '@/components/common/keyboard-commands.ts';
import lStorage from '@/utils/local-storage.ts';

describe('keyboard commands', () => {
	beforeEach(async () => {
		await lStorage.setItem(KEYBOARD_COMMANDS_STORAGE_KEY, null);
		await loadKeyboardCommandConfig();
	});

	it('should save and load custom shortcut bindings', async () => {
		const nextConfig = {
			...keyboardCommands,
			navigation: [
				{
					...keyboardCommands.navigation[0],
					bindings: [{ key: 'g', modifierMode: 'none' }] as const,
					displayKey: 'g',
				},
				...keyboardCommands.navigation.slice(1),
			],
		};

		await saveKeyboardCommandConfig(serializeKeyboardCommandConfig(nextConfig));
		await loadKeyboardCommandConfig();

		const command = getKeyboardCommand(
			'navigation',
			new KeyboardEvent('keydown', { key: 'g' })
		);

		expect(command?.id).toBe('go-home');
	});

	it('should fall back to defaults when stored shortcut JSON is invalid', async () => {
		await lStorage.setItem(KEYBOARD_COMMANDS_STORAGE_KEY, '{bad json');

		const config = await loadKeyboardCommandConfig();

		expect(config.navigation[0]?.displayKey).toBe(keyboardCommands.navigation[0].displayKey);
	});

	it('should reject unknown command ids', () => {
		const nextConfig = {
			...keyboardCommands,
			navigation: [
				{
					...keyboardCommands.navigation[0],
					id: 'unknown',
				},
				...keyboardCommands.navigation.slice(1),
			],
		};

		expect(() => parseKeyboardCommandConfig(JSON.stringify(nextConfig))).toThrow(
			'navigation.go-home.id must remain "go-home".'
		);
	});
});
