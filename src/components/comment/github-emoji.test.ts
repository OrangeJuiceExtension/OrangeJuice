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
			name: 'replaces a simple shortcode',
			input: '<span class="commtext">I :heart: this</span>',
			expected: 'I ❤️ this',
		},
		{
			name: 'replaces multiple shortcodes in one text node',
			input: '<span class="commtext">:+1: :tada: ship it</span>',
			expected: '👍 🎉 ship it',
		},
		{
			name: 'leaves unknown shortcodes untouched',
			input: '<span class="commtext">:not_a_real_emoji:</span>',
			expected: ':not_a_real_emoji:',
		},
		{
			name: 'supports uppercase shortcode input',
			input: '<span class="commtext">:HEART:</span>',
			expected: '❤️',
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
