import { beforeEach, describe, expect, it } from 'vitest';
import {
	cloneChildNodesInto,
	createSanitizedFragment,
	replaceChildrenWithSanitizedHtml,
} from './html.ts';

describe('html utils', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	describe('createSanitizedFragment', () => {
		it('creates a fragment from HTML text', () => {
			const fragment = createSanitizedFragment(
				document,
				'<p>Hello <strong>world</strong></p><span>!</span>'
			);

			const container = document.createElement('div');
			container.append(fragment);

			expect(container.innerHTML).toBe('<p>Hello <strong>world</strong></p><span>!</span>');
		});

		it('imports parsed nodes into the target document', () => {
			const fragment = createSanitizedFragment(document, '<a href="/item?id=1">link</a>');
			const link = fragment.firstChild;

			expect(link?.ownerDocument).toBe(document);
			expect((link as HTMLAnchorElement | null)?.href).toContain('/item?id=1');
		});
	});

	describe('replaceChildrenWithSanitizedHtml', () => {
		it('replaces existing children with parsed HTML', () => {
			const element = document.createElement('div');
			element.textContent = 'old';

			const fragment = replaceChildrenWithSanitizedHtml(
				element,
				'<span class="new">new</span><em>content</em>'
			);

			expect(element.innerHTML).toBe('<span class="new">new</span><em>content</em>');
			expect(fragment.childNodes).toHaveLength(0);
		});
	});

	describe('cloneChildNodesInto', () => {
		it('clones child nodes from source to target', () => {
			const source = document.createElement('div');
			source.append(
				document.createTextNode('hello '),
				Object.assign(document.createElement('strong'), { textContent: 'there' })
			);
			const target = document.createElement('div');

			cloneChildNodesInto(source, target);

			expect(target.innerHTML).toBe('hello <strong>there</strong>');
			expect(target.firstChild).not.toBe(source.firstChild);
		});

		it('replaces existing target children', () => {
			const source = document.createElement('div');
			source.append(Object.assign(document.createElement('span'), { textContent: 'fresh' }));
			const target = document.createElement('div');
			target.append(Object.assign(document.createElement('em'), { textContent: 'stale' }));

			cloneChildNodesInto(source, target);

			expect(target.innerHTML).toBe('<span>fresh</span>');
		});
	});
});
