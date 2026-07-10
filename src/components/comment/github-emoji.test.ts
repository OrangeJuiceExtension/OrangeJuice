import { beforeEach, describe, expect, it } from 'vitest';
import { backticksToCode } from '@/components/comment/backticks-to-code.ts';
import { githubEmoji } from './github-emoji.ts';

const renderComments = (commentMarkup: string): HTMLElement[] => {
	document.body.innerHTML = `
		<table>
			<tbody>
				<tr class="comtr">
					<td>${commentMarkup}</td>
				</tr>
			</tbody>
		</table>
	`;

	return Array.from(document.querySelectorAll<HTMLElement>('.comtr'));
};

describe('githubEmoji', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	it.each([
		{
			expected: 'I ❤️ this',
			input: '<span class="commtext">I :heart: this</span>',
			name: 'replaces a simple shortcode',
		},
		{
			expected: '👍 🎉 ship it',
			input: '<span class="commtext">:+1: :tada: ship it</span>',
			name: 'replaces multiple shortcodes in one text node',
		},
		{
			expected: ':not_a_real_emoji:',
			input: '<span class="commtext">:not_a_real_emoji:</span>',
			name: 'leaves unknown shortcodes untouched',
		},
		{
			expected: '❤️',
			input: '<span class="commtext">:HEART:</span>',
			name: 'supports uppercase shortcode input',
		},
	])('$name', ({ input, expected }) => {
		const comments = renderComments(input);

		githubEmoji(document, comments);

		const commentSpan = document.querySelector<HTMLElement>('.commtext');
		expect(commentSpan?.innerHTML).toBe(expected);
	});

	it('skips existing code and pre content', () => {
		const comments = renderComments(`
			<span class="commtext">
				<p>Inline :heart:</p>
				<code>:heart:</code>
				<pre>:heart:</pre>
			</span>
		`);

		githubEmoji(document, comments);

		const commentSpan = document.querySelector<HTMLElement>('.commtext');
		expect(commentSpan?.innerHTML).toContain('<p>Inline ❤️</p>');
		expect(commentSpan?.innerHTML).toContain('<code>:heart:</code>');
		expect(commentSpan?.innerHTML).toContain('<pre>:heart:</pre>');
	});

	it('does not throw when a comment has no commtext', () => {
		const comments = renderComments('<div>missing</div>');

		expect(() => githubEmoji(document, comments)).not.toThrow();
	});

	it('does not replace shortcodes inside backtick-generated code elements', () => {
		const comments = renderComments(
			'<span class="commtext">Code `:heart:` and text :heart:</span>'
		);

		backticksToCode(document, comments);
		githubEmoji(document, comments);

		const commentSpan = document.querySelector<HTMLElement>('.commtext');
		expect(commentSpan?.innerHTML).toBe('Code <code>:heart:</code> and text ❤️');
	});
});
