import { beforeEach, describe, expect, it } from 'vitest';
import {
	KEYBOARD_COMMANDS_STORAGE_KEY,
	keyboardCommands,
	serializeKeyboardCommandConfig,
} from '@/components/common/keyboard-commands.ts';
import { getKeyboardShortcutsHelp } from '@/components/common/keyboard-shortcuts-help.tsx';
import lStorage from '@/utils/local-storage.ts';

describe('keyboard shortcuts help', () => {
	let help: HTMLElement;
	const waitForRender = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

	beforeEach(async () => {
		await lStorage.setItem(KEYBOARD_COMMANDS_STORAGE_KEY, null);
		const doc = document.implementation.createHTMLDocument();
		help = await getKeyboardShortcutsHelp(doc);
		doc.body.appendChild(help);
		await waitForRender();
	});

	it('should include modifier icons and arrow keys in shortcuts', () => {
		const text = help.textContent ?? '';

		expect(text).not.toContain('(requires alt or ⌥)');
		expect(text).toContain('Alt/⌥ + H');
		expect(text).toContain('⇧');
		expect(text).toContain('←');
		expect(text).toContain('→');
		expect(text).toContain('↑');
		expect(text).toContain('↓');
		expect(text).toContain('N');
		expect(text).toContain('P');
		expect(text).toContain('p');
		expect(text).toContain('n');
	});

	it('should include the comment scroll-to-top shortcut', () => {
		const text = help.textContent ?? '';

		expect(text).toContain('z');
		expect(text).toContain('Scroll selected comment to top of window');
		expect(text).toContain('Copy selected story HN link');
		expect(text).toContain('Copy selected comment HN link');
	});

	it('should include website and github links', () => {
		const links = help.querySelectorAll('a');
		const hrefs = new Set<string>();
		for (const link of links) {
			const href = link.getAttribute('href');
			if (href) {
				hrefs.add(href);
			}
		}

		expect(hrefs.has('https://oj-hn.com')).toBe(true);
		expect(hrefs.has('https://github.com/OrangeJuiceExtension/OrangeJuice')).toBe(true);
	});

	it('should use a bundled extension logo path', () => {
		const logo = help.querySelector<HTMLImageElement>('img[alt="Orange Juice logo"]');
		const src = logo?.getAttribute('src') ?? '';
		expect(src.startsWith('chrome-extension://')).toBe(true);
		expect(src.endsWith('/icon/orange_juice_icon_128x128.png')).toBe(true);
	});

	it('should include the email link with a subject', async () => {
		await waitForRender();

		const emailLink = Array.from(help.querySelectorAll('a')).find(
			(link) => link.textContent === 'Email'
		);

		expect(emailLink).toBeDefined();
		expect(emailLink?.getAttribute('href')).toBe(
			'mailto:hello@oj-hn.com?subject=Question about OJ'
		);
	});

	it('should show the JSON editor and restore help on cancel', () => {
		const editButton = help.querySelector<HTMLButtonElement>('.oj-shortcuts-help__edit-button');
		editButton?.click();

		expect(help.querySelector('textarea')?.textContent).toBeDefined();
		expect(help.textContent).toContain('Edit keyboard shortcuts');

		const cancelButton = Array.from(help.querySelectorAll('button')).find(
			(button) => button.textContent === 'Cancel'
		);
		cancelButton?.click();

		expect(help.textContent).toContain('Navigation shortcuts');
		expect(help.querySelector('textarea')).toBeNull();
	});

	it('should reject invalid JSON when saving shortcuts', async () => {
		const editButton = help.querySelector<HTMLButtonElement>('.oj-shortcuts-help__edit-button');
		editButton?.click();

		const textarea = help.querySelector<HTMLTextAreaElement>('textarea');
		if (!textarea) {
			throw new Error('Expected editor textarea');
		}
		textarea.value = '{bad json';

		const saveButton = Array.from(help.querySelectorAll('button')).find(
			(button) => button.textContent === 'Save shortcuts'
		);
		saveButton?.click();
		await waitForRender();

		expect(help.textContent).toContain('Shortcut JSON could not be parsed.');
		expect(await lStorage.getItem(KEYBOARD_COMMANDS_STORAGE_KEY)).toBeNull();
	});

	it('should save valid JSON and return to the help view', async () => {
		const editButton = help.querySelector<HTMLButtonElement>('.oj-shortcuts-help__edit-button');
		editButton?.click();

		const textarea = help.querySelector<HTMLTextAreaElement>('textarea');
		if (!textarea) {
			throw new Error('Expected editor textarea');
		}
		const nextConfig = {
			...keyboardCommands,
			navigation: [
				{
					...keyboardCommands.navigation[0],
					displayKey: 'Custom Home',
				},
				...keyboardCommands.navigation.slice(1),
			],
		};
		textarea.value = serializeKeyboardCommandConfig(nextConfig);

		const saveButton = Array.from(help.querySelectorAll('button')).find(
			(button) => button.textContent === 'Save shortcuts'
		);
		saveButton?.click();
		await waitForRender();

		expect(help.textContent).toContain('Keyboard shortcuts saved.');
		expect(help.textContent).toContain('Custom Home');
		expect(await lStorage.getItem(KEYBOARD_COMMANDS_STORAGE_KEY)).toContain('Custom Home');
	});
});
