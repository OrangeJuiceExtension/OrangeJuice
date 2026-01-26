import { beforeEach, describe, expect, it } from 'vitest';
import { backticksToCode } from './backticks-to-code';

describe('backticksToCode', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
		Object.defineProperty(document, 'location', {
			value: { pathname: '/item' },
			writable: true,
			configurable: true,
		});
	});

	it('should convert backticks to code tags', () => {
		document.body.innerHTML = `
			<div class="comment">
				<span class="commtext">This is some text with \`code\` in it</span>
			</div>
		`;

		const comments = document.querySelectorAll('.comment');
		backticksToCode(document, Array.from(comments));

		const commentSpan = document.querySelector('.commtext');
		expect(commentSpan?.innerHTML).toBe('This is some text with <code>code</code> in it');
	});

	it('should handle multiple backtick pairs in one comment', () => {
		document.body.innerHTML = `
			<div class="comment">
				<span class="commtext">Use \`const\` and \`let\` instead of \`var\`</span>
			</div>
		`;

		const comments = document.querySelectorAll('.comment');
		backticksToCode(document, Array.from(comments));

		const commentSpan = document.querySelector('.commtext');
		expect(commentSpan?.innerHTML).toBe(
			'Use <code>const</code> and <code>let</code> instead of <code>var</code>'
		);
	});

	it('should handle multiline code in backticks', () => {
		document.body.innerHTML = `
			<div class="comment">
				<span class="commtext">Example: \`function foo() {
						return 42;
					}\`
				</span>
			</div>
		`;

		const comments = document.querySelectorAll('.comment');
		backticksToCode(document, Array.from(comments));

		const commentSpan = document.querySelector('.commtext');
		expect(commentSpan?.innerHTML).toContain('<code>function foo() {');
		expect(commentSpan?.innerHTML).toContain('return 42;');
		expect(commentSpan?.innerHTML).toContain('}</code>');
	});

	it('should process multiple comments', () => {
		document.body.innerHTML = `
			<div class="comment">
				<span class="commtext">First \`comment\`</span>
			</div>
			<div class="comment">
				<span class="commtext">Second \`comment\`</span>
			</div>
		`;

		const comments = document.querySelectorAll('.comment');
		backticksToCode(document, Array.from(comments));

		const commentSpans = document.querySelectorAll('.commtext');
		expect(commentSpans[0]?.innerHTML).toBe('First <code>comment</code>');
		expect(commentSpans[1]?.innerHTML).toBe('Second <code>comment</code>');
	});

	it('should skip comments without commtext span', () => {
		document.body.innerHTML = `
			<div class="comment">
				<div>No commtext here</div>
			</div>
		`;

		const comments = document.querySelectorAll('.comment');
		expect(() => backticksToCode(document, Array.from(comments))).not.toThrow();
	});

	it('should not convert escaped backticks', () => {
		document.body.innerHTML = `
			<div class="comment">
				<span class="commtext">This \\\`should not\\\` be converted</span>
			</div>
		`;

		const comments = document.querySelectorAll('.comment');
		backticksToCode(document, Array.from(comments));

		const commentSpan = document.querySelector('.commtext');
		expect(commentSpan?.innerHTML).toBe('This \\`should not\\` be converted');
	});

	it('should convert unescaped backticks but not escaped ones', () => {
		document.body.innerHTML = `
			<div class="comment">
				<span class="commtext">Convert \`this\` but not \\\`this\\\`</span>
			</div>
		`;

		const comments = document.querySelectorAll('.comment');
		backticksToCode(document, Array.from(comments));

		const commentSpan = document.querySelector('.commtext');
		expect(commentSpan?.innerHTML).toBe('Convert <code>this</code> but not \\`this\\`');
	});

	it('should process on valid comment paths', () => {
		Object.defineProperty(document, 'location', {
			value: { pathname: '/item?id=123' },
			writable: true,
			configurable: true,
		});

		document.body.innerHTML = `
			<div class="comment">
				<span class="commtext">This \`should\` be converted</span>
			</div>
		`;

		const comments = document.querySelectorAll('.comment');
		backticksToCode(document, Array.from(comments));

		const commentSpan = document.querySelector('.commtext');
		expect(commentSpan?.innerHTML).toBe('This <code>should</code> be converted');
	});

	it('should handle empty backticks', () => {
		document.body.innerHTML = `
			<div class="comment">
				<span class="commtext">Empty backticks: \`\` here</span>
			</div>
		`;

		const comments = document.querySelectorAll('.comment');
		backticksToCode(document, Array.from(comments));

		const commentSpan = document.querySelector('.commtext');
		expect(commentSpan?.innerHTML).toBe('Empty backticks: <code></code> here');
	});

	it('should handle nested HTML with backticks', () => {
		document.body.innerHTML = `
			<div class="comment">
				<span class="commtext"><p>Some \`code\` here</p></span>
			</div>
		`;

		const comments = document.querySelectorAll('.comment');
		backticksToCode(document, Array.from(comments));

		const commentSpan = document.querySelector('.commtext');
		expect(commentSpan?.innerHTML).toBe('<p>Some <code>code</code> here</p>');
	});

	it('should preserve spaces in backticked code', () => {
		document.body.innerHTML = `
			<div class="comment">
				<span class="commtext">Code: \`  spaced  \`</span>
			</div>
		`;

		const comments = document.querySelectorAll('.comment');
		backticksToCode(document, Array.from(comments));

		const commentSpan = document.querySelector('.commtext');
		expect(commentSpan?.innerHTML).toBe('Code: <code>  spaced  </code>');
	});

	it('should handle backticks with special characters', () => {
		document.body.innerHTML = `
			<div class="comment">
				<span class="commtext">Special: \`&lt;div&gt;\`</span>
			</div>
		`;

		const comments = document.querySelectorAll('.comment');
		backticksToCode(document, Array.from(comments));

		const commentSpan = document.querySelector('.commtext');
		expect(commentSpan?.innerHTML).toBe('Special: <code>&lt;div&gt;</code>');
	});
});
