import { beforeEach, describe, expect, it } from 'vitest';
import {
	cloneChildNodesInto,
	createSanitizedFragment,
	linkifyTextNodes,
	replaceChildrenWithSanitizedHtml,
} from './html.ts';

describe('html utils', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	describe('createSanitizedFragment', () => {
		const renderSanitized = (html: string): HTMLDivElement => {
			const fragment = createSanitizedFragment(document, html);
			const container = document.createElement('div');
			container.append(fragment);
			return container;
		};

		it.each([
			{
				expected: '<p>Hello <strong>world</strong></p><span>!</span>',
				html: '<p>Hello <strong>world</strong></p><span>!</span>',
				name: 'creates a fragment from HTML text',
			},
			{
				expected: '<div><span>safe</span></div>',
				html: '<div><script>alert(1)</script><span>safe</span><style>body{}</style></div>',
				name: 'strips unsafe elements while preserving safe siblings',
			},
			{
				expected: '<p>before</p><p>after</p>',
				html: '<p>before</p><template><p>hidden</p></template><iframe src="/x"></iframe><p>after</p>',
				name: 'removes template and iframe content entirely',
			},
		])('$name', ({ html, expected }) => {
			const container = renderSanitized(html);

			expect(container.innerHTML).toBe(expected);
		});

		it('imports parsed nodes into the target document', () => {
			const fragment = createSanitizedFragment(document, '<a href="/item?id=1">link</a>');
			const link = fragment.firstChild;

			expect(link?.ownerDocument).toBe(document);
			expect((link as HTMLAnchorElement | null)?.href).toContain('/item?id=1');
		});

		it('preserves allowed anchor attributes from the sanitize schema', () => {
			const container = renderSanitized(
				'<a href="https://example.com" rel="nofollow" target="_blank" title="Example">link</a>'
			);
			const link = container.querySelector('a');

			expect(link?.getAttribute('href')).toBe('https://example.com');
			expect(link?.getAttribute('rel')).toBe('nofollow');
			expect(link?.getAttribute('target')).toBe('_blank');
			expect(link?.getAttribute('title')).toBe('Example');
		});

		it.each([
			{
				attribute: 'href',
				html: '<a href="javascript:alert(1)">link</a>',
				selector: 'a',
			},
			{
				attribute: 'src',
				html: '<img src="javascript:alert(1)">',
				selector: 'img',
			},
		])('removes unsafe $attribute attributes', ({ attribute, html, selector }) => {
			const container = renderSanitized(html);

			expect(container.querySelector(selector)?.getAttribute(attribute)).toBeNull();
		});

		it('drops disallowed elements instead of preserving their attributes', () => {
			const container = renderSanitized('<button onclick="alert(1)">click</button>');

			expect(container.querySelector('button')).toBeNull();
			expect(container.textContent).toBe('click');
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

			expect(element.innerHTML).toBe('<span>new</span><em>content</em>');
			expect(fragment.childNodes).toHaveLength(0);
		});
	});

	describe('linkifyTextNodes', () => {
		it('linkifies plain URLs without reparsing HTML strings', () => {
			const element = document.createElement('div');
			element.append('Visit https://example.com for details');

			linkifyTextNodes(element, { openInNewTab: true });

			const link = element.querySelector('a');
			expect(link?.href).toBe('https://example.com/');
			expect(link?.target).toBe('_blank');
			expect(link?.rel).toBe('noopener noreferrer');
		});

		it('skips text inside existing anchors', () => {
			const element = document.createElement('div');
			const link = document.createElement('a');
			link.href = 'https://example.com';
			link.textContent = 'https://example.com';
			element.append(link);

			linkifyTextNodes(element, { openInNewTab: true });

			expect(element.querySelectorAll('a')).toHaveLength(1);
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
