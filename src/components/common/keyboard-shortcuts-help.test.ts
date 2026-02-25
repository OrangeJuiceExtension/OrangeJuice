import { beforeEach, describe, expect, it } from 'vitest';
import { getKeyboardShortcutsHelp } from '@/components/common/keyboard-shortcuts-help.tsx';

describe('keyboard shortcuts help', () => {
	let help: HTMLElement;
	const waitForRender = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

	beforeEach(async () => {
		const doc = document.implementation.createHTMLDocument();
		help = getKeyboardShortcutsHelp(doc);
		doc.body.appendChild(help);
		await waitForRender();
	});

	it('should include modifier icons and arrow keys in shortcuts', () => {
		const text = help.textContent ?? '';

		expect(text).toContain('(requires alt or ⌥)');
		expect(text).toContain('⇧');
		expect(text).toContain('←');
		expect(text).toContain('→');
		expect(text).toContain('↑');
		expect(text).toContain('↓');
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

	it('should include the email link with a subject', () => {
		const emailLink = Array.from(help.querySelectorAll('a')).find(
			(link) => link.textContent === 'Email'
		);

		expect(emailLink).toBeDefined();
		expect(emailLink?.getAttribute('href')).toBe(
			'mailto:hello@oj-hn.com?subject=Question about OJ'
		);
	});
});
