import { describe, expect, it } from 'vitest';
import { wrapBodyWithHnTemplate } from '@/components/common/hn-template.tsx';
import { version } from '../../../package.json';

describe('wrapBodyWithHnTemplate', () => {
	it('wraps existing body children into the template body', async () => {
		const doc = document.implementation.createHTMLDocument();
		const content = doc.createElement('div');
		content.id = 'login-form';
		content.textContent = 'Login';
		doc.body.appendChild(content);

		await wrapBodyWithHnTemplate(doc);

		const bodySlot = doc.querySelector('.oj-hn-body');
		expect(bodySlot).toBeTruthy();
		expect(bodySlot?.querySelector('#login-form')).toBeTruthy();
	});

	it('renders default nav and footer', async () => {
		const doc = document.implementation.createHTMLDocument();
		doc.body.appendChild(doc.createElement('div'));

		await wrapBodyWithHnTemplate(doc);

		const nav = doc.querySelector('.oj-hn-nav');
		const footer = doc.querySelector('.oj-hn-footer');
		const logo = doc.querySelector('img[src="https://news.ycombinator.com/y18.svg"]');
		const ojLink = doc.querySelector('a[href="https://oj-hn.com"]');

		expect(nav?.textContent).toContain('Hacker News');
		expect(footer?.textContent).toContain('Guidelines');
		expect(logo).toBeTruthy();
		expect(ojLink?.getAttribute('title')).toBe(version);
	});

	it('renders custom navigation when provided', async () => {
		const doc = document.implementation.createHTMLDocument();
		const content = doc.createElement('div');
		content.textContent = 'Content';
		doc.body.appendChild(content);

		const nav = doc.createElement('div');
		nav.textContent = 'Custom Nav';

		await wrapBodyWithHnTemplate(doc, { nav });

		const navContainer = doc.querySelector('.oj-hn-nav');
		expect(navContainer?.textContent).toContain('Custom Nav');
	});

	it('renders custom footer when provided', async () => {
		const doc = document.implementation.createHTMLDocument();
		const content = doc.createElement('div');
		content.textContent = 'Content';
		doc.body.appendChild(content);

		const footer = doc.createElement('div');
		footer.textContent = 'Custom Footer';

		await wrapBodyWithHnTemplate(doc, { footer });

		const footerContainer = doc.querySelector('.oj-hn-footer');
		expect(footerContainer?.textContent).toContain('Custom Footer');
	});

	it('applies a custom top bar color when provided', async () => {
		const doc = document.implementation.createHTMLDocument();
		doc.body.appendChild(doc.createElement('div'));

		await wrapBodyWithHnTemplate(doc, { topColor: '#aabbff' });

		const nav = doc.querySelector<HTMLTableCellElement>('.oj-hn-nav');
		expect(nav?.getAttribute('bgcolor')).toBe('#aabbff');
		expect(nav?.style.backgroundColor).toBe('#aabbff');
	});
});
