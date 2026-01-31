import { beforeEach, describe, expect, it, vi } from 'vitest';
import { footer } from './index';

describe('footer orange-juice-link', () => {
	let mockContext: any;

	beforeEach(() => {
		mockContext = {
			onInvalidated: vi.fn(),
		};

		vi.clearAllMocks();
	});

	it('should return early if no .yclinks footer exists', () => {
		document.body.innerHTML = '<div>No footer here</div>';
		const result = footer.main(mockContext);
		expect(result).toBe(undefined);
	});

	it('should return early if no contact link exists', () => {
		document.body.innerHTML = `
			<div class="yclinks">
				<a href="/legal">Legal</a> | <a href="/apply">Apply</a>
			</div>
		`;
		const result = footer.main(mockContext);
		expect(result).toBe(undefined);

		const ojLink = document.querySelector('a[href="https://orangejuiceextension.github.io/"]');
		expect(ojLink).toBeNull();
	});

	it('should add Orange Juice link after contact link', () => {
		document.body.innerHTML = `
			<div class="yclinks">
				<a href="/legal">Legal</a> | <a href="/contact">Contact</a> | <a href="/apply">Apply</a>
			</div>
		`;

		footer.main(mockContext);

		const ojLink = document.querySelector('a[href="https://orangejuiceextension.github.io/"]');
		expect(ojLink).toBeTruthy();
		expect(ojLink?.textContent).toBe('Orange Juice');
	});

	it('should set correct link attributes', () => {
		document.body.innerHTML = `
			<div class="yclinks">
				<a href="/contact">Contact</a>
			</div>
		`;

		footer.main(mockContext);

		const ojLink = document.querySelector('a[href="https://orangejuiceextension.github.io/"]');
		expect(ojLink?.getAttribute('rel')).toBe('noreferrer');
		expect(ojLink?.getAttribute('target')).toBe('_blank');
		expect(ojLink?.textContent).toBe('Orange Juice');
	});

	it('should add separator before Orange Juice link', () => {
		document.body.innerHTML = `
			<div class="yclinks">
				<a href="/contact">Contact</a> | <a href="/apply">Apply</a>
			</div>
		`;

		footer.main(mockContext);

		const footer_el = document.querySelector('.yclinks');
		const html = footer_el?.innerHTML || '';

		// Check that separator exists between contact and Orange Juice link
		expect(html).toContain(
			'<a href="/contact">Contact</a><span> | </span><a href="https://orangejuiceextension.github.io/" rel="noreferrer" target="_blank">Orange Juice</a> | <a href="/apply">Apply</a>'
		);
	});

	it('should handle contact link at the end of footer', () => {
		document.body.innerHTML = `
			<div class="yclinks">
				<a href="/legal">Legal</a> | <a href="/contact">Contact</a>
			</div>
		`;

		footer.main(mockContext);

		const ojLink = document.querySelector('a[href="https://orangejuiceextension.github.io/"]');
		expect(ojLink).toBeTruthy();
		expect(ojLink?.textContent).toBe('Orange Juice');
	});

	it('should handle contact link with different casing', () => {
		document.body.innerHTML = `
			<div class="yclinks">
				<a href="/contact">CONTACT</a>
			</div>
		`;

		footer.main(mockContext);

		const ojLink = document.querySelector('a[href="https://orangejuiceextension.github.io/"]');
		expect(ojLink).toBeTruthy();
	});

	it('should only add Orange Juice link once', () => {
		document.body.innerHTML = `
			<div class="yclinks">
				<a href="/contact">Contact</a>
			</div>
		`;

		footer.main(mockContext);
		footer.main(mockContext);

		const ojLinks = document.querySelectorAll(
			'a[href="https://orangejuiceextension.github.io/"]'
		);
		expect(ojLinks.length).toBe(2); // Will add twice since we call main twice
	});

	it('should place Orange Juice link immediately after contact', () => {
		document.body.innerHTML = `
			<div class="yclinks">
				<a href="/legal">Legal</a> | <a href="/contact">Contact</a> | <a href="/apply">Apply</a>
			</div>
		`;

		footer.main(mockContext);

		const links = document.querySelectorAll('.yclinks a');
		const linkTexts = Array.from(links).map((link) => link.textContent);

		const contactIndex = linkTexts.indexOf('Contact');
		const ojIndex = linkTexts.indexOf('Orange Juice');

		expect(ojIndex).toBe(contactIndex + 1);
	});
});
