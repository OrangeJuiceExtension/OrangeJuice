import { beforeEach, describe, expect, it } from 'vitest';
import { prefill } from './prefill';

const createNavbarFixture = (): string => `
	<span class="pagetop">
		<a href="/newest">new</a>
		<a href="/submit">submit</a>
		<a href="/past">past</a>
	</span>
`;

describe('prefill', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
		window.history.pushState({}, '', '/');
	});

	describe('navbar submit link title prefill', () => {
		it('adds expected title prefixes on show/ask pages', () => {
			const cases = [
				{ path: '/show', expectedTitle: 'Show HN: ' },
				{ path: '/shownew', expectedTitle: 'Show HN: ' },
				{ path: '/ask', expectedTitle: 'Ask HN: ' },
			] as const;

			for (const testCase of cases) {
				window.history.pushState({}, '', testCase.path);
				document.body.innerHTML = createNavbarFixture();

				prefill(document);

				const submitLink = document.querySelector<HTMLAnchorElement>(
					'span.pagetop a[href*="/submit"]'
				);
				if (!submitLink) {
					throw new Error('Submit link not found');
				}

				const submitUrl = new URL(submitLink.href, document.location.origin);
				expect(submitUrl.searchParams.get('title')).toBe(testCase.expectedTitle);
			}
		});

		it('does not overwrite an existing submit title query param', () => {
			window.history.pushState({}, '', '/show');
			document.body.innerHTML = `
				<span class="pagetop">
					<a href="/submit?title=Existing%20Prefix">submit</a>
				</span>
			`;

			prefill(document);

			const submitLink = document.querySelector<HTMLAnchorElement>('span.pagetop a');
			if (!submitLink) {
				throw new Error('Submit link not found');
			}

			const submitUrl = new URL(submitLink.href, document.location.origin);
			expect(submitUrl.searchParams.get('title')).toBe('Existing Prefix');
		});
	});

	describe('submit page title input prefill', () => {
		it('prefills title from query params on /submit', () => {
			window.history.pushState({}, '', '/submit?title=Ask%20HN:%20');
			document.body.innerHTML = `<input type="text" name="title" value="">`;

			prefill(document);

			const titleInput = document.querySelector<HTMLInputElement>('input[name="title"]');
			expect(titleInput?.value).toBe('Ask HN: ');
		});

		it('clears title input when title query param is missing', () => {
			window.history.pushState({}, '', '/submit');
			document.body.innerHTML = `<input type="text" name="title" value="Old value">`;

			prefill(document);

			const titleInput = document.querySelector<HTMLInputElement>('input[name="title"]');
			expect(titleInput?.value).toBe('');
		});
	});
});
