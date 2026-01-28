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

	it('should parse reference link with bracket notation [1]', () => {
		const element = document.createElement('div');
		element.innerHTML = `
			<p>[100] <a href="https://example.com">Example</a></p>
		`;

		const result = parseReferenceLinks(element);

		expect(result).toEqual([{ index: 100, href: 'https://example.com/' }]);
	});

	it('should parse reference link with bracket and colon notation [1]:', () => {
		const element = document.createElement('div');
		element.innerHTML = `
			<p>[1]: <a href="https://example.com">Example</a></p>
		`;

		const result = parseReferenceLinks(element);

		expect(result).toEqual([{ index: 1, href: 'https://example.com/' }]);
	});

	it('should parse reference link with number and colon 1:', () => {
		const element = document.createElement('div');
		element.innerHTML = `
			<p>1: <a href="https://example.com">Example</a></p>
		`;

		const result = parseReferenceLinks(element);

		expect(result).toEqual([{ index: 1, href: 'https://example.com/' }]);
	});

	it('should parse reference link with number and period 1.', () => {
		const element = document.createElement('div');
		element.innerHTML = `
			<p>1. <a href="https://example.com">Example</a></p>
		`;

		const result = parseReferenceLinks(element);

		expect(result).toEqual([{ index: 1, href: 'https://example.com/' }]);
	});

	it('should parse reference link with just a number', () => {
		const element = document.createElement('div');
		element.innerHTML = `
			<p>1 <a href="https://example.com">Example</a></p>
		`;

		const result = parseReferenceLinks(element);

		expect(result).toEqual([{ index: 1, href: 'https://example.com/' }]);
	});

	it('should parse reference links with bullet point marker -', () => {
		const element = document.createElement('div');
		element.innerHTML = `
			<p>- [1] <a href="https://example.com">Example</a></p>
		`;

		const result = parseReferenceLinks(element);

		expect(result).toEqual([{ index: 1, href: 'https://example.com/' }]);
	});

	it('should parse reference links with asterisk bullet point marker *', () => {
		const element = document.createElement('div');
		element.innerHTML = `
			<p>* [2] <a href="https://example.org">Example</a></p>
		`;

		const result = parseReferenceLinks(element);

		expect(result).toEqual([{ index: 2, href: 'https://example.org/' }]);
	});

	it('should parse multiple reference links', () => {
		const element = document.createElement('div');
		element.innerHTML = `
			<p>[1] <a href="https://example.com">First</a></p>
			<p>[2] <a href="https://example.org">Second</a></p>
			<p>[3] <a href="https://example.net">Third</a></p>
		`;

		const result = parseReferenceLinks(element);

		expect(result).toEqual([
			{ index: 1, href: 'https://example.com/' },
			{ index: 2, href: 'https://example.org/' },
			{ index: 3, href: 'https://example.net/' },
		]);
	});

	it('should skip paragraphs without links', () => {
		const element = document.createElement('div');
		element.innerHTML = `
			<p>[1] <a href="https://example.com">First</a></p>
			<p>Some text without a link</p>
			<p>[2] <a href="https://example.org">Second</a></p>
		`;

		const result = parseReferenceLinks(element);

		expect(result).toEqual([
			{ index: 1, href: 'https://example.com/' },
			{ index: 2, href: 'https://example.org/' },
		]);
	});

	it('should skip paragraphs without matching index pattern', () => {
		const element = document.createElement('div');
		element.innerHTML = `
			<p>[1] <a href="https://example.com">Valid</a></p>
			<p>Random text <a href="https://example.org">Invalid</a></p>
			<p>[2] <a href="https://example.net">Valid</a></p>
		`;

		const result = parseReferenceLinks(element);

		expect(result).toEqual([
			{ index: 1, href: 'https://example.com/' },
			{ index: 2, href: 'https://example.net/' },
		]);
	});

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

	it('should handle various bracket and colon combinations', () => {
		const element = document.createElement('div');
		element.innerHTML = `
			<p>[1]: <a href="https://example1.com">Example 1</a></p>
			<p>[2]. <a href="https://example2.com">Example 2</a></p>
		`;

		const result = parseReferenceLinks(element);

		expect(result).toEqual([
			{ index: 1, href: 'https://example1.com/' },
			{ index: 2, href: 'https://example2.com/' },
		]);
	});
});
