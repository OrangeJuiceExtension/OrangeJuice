import { describe, expect, it } from 'vitest';
import { getKeyboardShortcutsHelp } from '@/components/common/keyboard-shortcuts-help.ts';

describe('keyboard shortcuts help', () => {
	it('should include modifier icons and arrow keys in shortcuts', () => {
		const doc = document.implementation.createHTMLDocument();
		const help = getKeyboardShortcutsHelp(doc);

		const text = help.textContent ?? '';

		expect(text).toContain('(requires alt or ⌥)');
		expect(text).toContain('⇧');
		expect(text).toContain('←');
		expect(text).toContain('→');
		expect(text).toContain('↑');
		expect(text).toContain('↓');
	});

	it('should include website and github links', () => {
		const doc = document.implementation.createHTMLDocument();
		const help = getKeyboardShortcutsHelp(doc);

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
});
