import { describe, expect, it } from 'vitest';
import { wrapBodyWithHnTemplate } from '@/components/common/hn-template.tsx';
import { version } from '../../../package.json';

const flushEffects = async () => {
	await new Promise((resolve) => setTimeout(resolve, 0));
};

describe('wrapBodyWithHnTemplate', () => {
	it('wraps existing body children into the template body', async () => {
		const doc = document.implementation.createHTMLDocument();
		const content = doc.createElement('div');
		content.id = 'login-form';
		content.textContent = 'Login';
		doc.body.appendChild(content);

		wrapBodyWithHnTemplate(doc);
		await flushEffects();

		const bodySlot = doc.querySelector('.oj-hn-body');
		expect(bodySlot).toBeTruthy();
		expect(bodySlot?.querySelector('#login-form')).toBeTruthy();
	});

	it('renders default nav and footer', async () => {
		const doc = document.implementation.createHTMLDocument();
		doc.body.appendChild(doc.createElement('div'));

		wrapBodyWithHnTemplate(doc);
		await flushEffects();

		const nav = doc.querySelector('.oj-hn-nav');
		const footer = doc.querySelector('.oj-hn-footer');
		const logo = doc.querySelector('img[src="/y18.svg"]');
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

		wrapBodyWithHnTemplate(doc, { nav: <div>Custom Nav</div> });
		await flushEffects();

		const nav = doc.querySelector('.oj-hn-nav');
		expect(nav?.textContent).toContain('Custom Nav');
	});
});
