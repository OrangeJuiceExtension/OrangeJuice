import { describe, expect, it } from 'vitest';
import { parseReferenceLinks } from './parse-reference-links';

describe('parseReferenceLinks', () => {
	it('should return empty array when no commtext span exists', () => {
		const element = document.createElement('div');
		element.innerHTML = '<div>No comment text here</div>';

		const result = parseReferenceLinks(element);

		expect(result).toEqual([]);
	});

	it('should return empty array when commtext has no children', () => {
		const element = document.createElement('div');
		element.innerHTML = '<span class="commtext">Just plain text</span>';

		const result = parseReferenceLinks(element);

		expect(result).toEqual([]);
	});

	const testCases = [
		{
			name: 'bracket notation [1]',
			html: '<p>[100] <a href="https://example.com">Example</a></p>',
			expected: [{ index: 100, href: 'https://example.com/' }],
		},
		{
			name: 'bracket and colon notation [1]:',
			html: '<p>[1]: <a href="https://example.com">Example</a></p>',
			expected: [{ index: 1, href: 'https://example.com/' }],
		},
		{
			name: 'number and colon 1:',
			html: '<p>1: <a href="https://example.com">Example</a></p>',
			expected: [{ index: 1, href: 'https://example.com/' }],
		},
		{
			name: 'number and period 1.',
			html: '<p>1. <a href="https://example.com">Example</a></p>',
			expected: [{ index: 1, href: 'https://example.com/' }],
		},
		{
			name: 'just a number',
			html: '<p>1 <a href="https://example.com">Example</a></p>',
			expected: [{ index: 1, href: 'https://example.com/' }],
		},
		{
			name: 'bullet point marker -',
			html: '<p>- [1] <a href="https://example.com">Example</a></p>',
			expected: [{ index: 1, href: 'https://example.com/' }],
		},
		{
			name: 'asterisk bullet point marker *',
			html: '<p>* [2] <a href="https://example.org">Example</a></p>',
			expected: [{ index: 2, href: 'https://example.org/' }],
		},
		{
			name: 'no space with newline',
			html: '<p>[0]\n<a href="https://example.org">Example</a></p>',
			expected: [{ index: 0, href: 'https://example.org/' }],
		},
		{
			name: 'no space',
			html: '<p>[0]<a href="https://example.org">Example</a></p>',
			expected: [{ index: 0, href: 'https://example.org/' }],
		},
	];

	for (const { name, html, expected } of testCases) {
		it(`should parse reference link with ${name}`, () => {
			const element = document.createElement('div');
			element.innerHTML = html;

			const result = parseReferenceLinks(element);

			expect(result).toEqual(expected);
		});
	}

	const skipTestCases = [
		{
			name: 'paragraphs without links',
			html: `
				<p>[1] <a href="https://example.com">First</a></p>
				<p>Some text without a link</p>
				<p>[2] <a href="https://example.org">Second</a></p>
			`,
			expected: [
				{ index: 1, href: 'https://example.com/' },
				{ index: 2, href: 'https://example.org/' },
			],
		},
		{
			name: 'paragraphs without matching index pattern',
			html: `
				<p>[1] <a href="https://example.com">Valid</a></p>
				<p>Random text <a href="https://example.org">Invalid</a></p>
				<p>[2] <a href="https://example.net">Valid</a></p>
			`,
			expected: [
				{ index: 1, href: 'https://example.com/' },
				{ index: 2, href: 'https://example.net/' },
			],
		},
	];

	for (const { name, html, expected } of skipTestCases) {
		it(`should skip ${name}`, () => {
			const element = document.createElement('div');
			element.innerHTML = html;

			const result = parseReferenceLinks(element);

			expect(result).toEqual(expected);
		});
	}

	it('should handle whitespace around index markers', () => {
		const element = document.createElement('div');
		element.innerHTML = `
			<p>  [1]  <a href="https://example.com">Example</a></p>
		`;

		const result = parseReferenceLinks(element);

		expect(result).toEqual([{ index: 1, href: 'https://example.com/' }]);
	});

	it('should skip when first child node has no textContent', () => {
		const element = document.createElement('div');
		const commtext = document.createElement('span');
		commtext.className = 'commtext';
		const p = document.createElement('p');
		const a = document.createElement('a');
		a.href = 'https://example.com';
		a.textContent = 'Example';
		p.append(a);
		commtext.append(p);
		element.append(commtext);

		const result = parseReferenceLinks(element);

		expect(result).toEqual([]);
	});

	const multiLinkTestCases = [
		{
			name: 'multiple reference links',
			html: `
				<p>[1] <a href="https://example.com">First</a></p>
				<p>[2] <a href="https://example.org">Second</a></p>
				<p>[3] <a href="https://example.net">Third</a></p>
			`,
			expected: [
				{ index: 1, href: 'https://example.com/' },
				{ index: 2, href: 'https://example.org/' },
				{ index: 3, href: 'https://example.net/' },
			],
		},
		{
			name: 'various bracket and colon combinations',
			html: `
				<p>[1]: <a href="https://example1.com">Example 1</a></p>
				<p>[2]. <a href="https://example2.com">Example 2</a></p>
			`,
			expected: [
				{ index: 1, href: 'https://example1.com/' },
				{ index: 2, href: 'https://example2.com/' },
			],
		},
	];

	for (const { name, html, expected } of multiLinkTestCases) {
		it(`should parse ${name}`, () => {
			const element = document.createElement('div');
			element.innerHTML = html;

			const result = parseReferenceLinks(element);

			expect(result).toEqual(expected);
		});
	}

	it('should handle whitespace around index markers', () => {
		const element = document.createElement('div');
		element.innerHTML = `
			<p>  [1]  <a href="https://example.com">Example</a></p>
		`;

		const result = parseReferenceLinks(element);

		expect(result).toEqual([{ index: 1, href: 'https://example.com/' }]);
	});
});
