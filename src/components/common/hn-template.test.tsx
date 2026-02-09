import { flushSync } from 'react-dom';
import { describe, expect, it } from 'vitest';
import { wrapBodyWithHnTemplate } from '@/components/common/hn-template.tsx';
import { version } from '../../../package.json';

describe('wrapBodyWithHnTemplate', () => {
	it('wraps existing body children into the template body', () => {
		const doc = document.implementation.createHTMLDocument();
		const content = doc.createElement('div');
		content.id = 'login-form';
		content.textContent = 'Login';
		doc.body.appendChild(content);

		flushSync(() => {
			wrapBodyWithHnTemplate(doc);
		});

		const bodySlot = doc.querySelector('.oj-hn-body');
		expect(bodySlot).toBeTruthy();
		expect(bodySlot?.querySelector('#login-form')).toBeTruthy();
	});

	it('renders default nav and footer', () => {
		const doc = document.implementation.createHTMLDocument();
		doc.body.appendChild(doc.createElement('div'));

		flushSync(() => {
			wrapBodyWithHnTemplate(doc);
		});

		const nav = doc.querySelector('.oj-hn-nav');
		const footer = doc.querySelector('.oj-hn-footer');
		const logo = doc.querySelector('img[src="/y18.svg"]');
		const ojLink = doc.querySelector('a[href="https://oj-hn.com"]');

		expect(nav?.textContent).toContain('Hacker News');
		expect(footer?.textContent).toContain('Guidelines');
		expect(logo).toBeTruthy();
		expect(ojLink?.getAttribute('title')).toBe(version);
	});

	it('renders custom navigation when provided', () => {
		const doc = document.implementation.createHTMLDocument();
		const content = doc.createElement('div');
		content.textContent = 'Content';
		doc.body.appendChild(content);

		flushSync(() => {
			wrapBodyWithHnTemplate(doc, {
				nav: <div>Custom Nav</div>,
			});
		});

		const nav = doc.querySelector('.oj-hn-nav');
		expect(nav?.textContent).toContain('Custom Nav');
	});

	it('renders custom footer when provided', () => {
		const doc = document.implementation.createHTMLDocument();
		const content = doc.createElement('div');
		content.textContent = 'Content';
		doc.body.appendChild(content);

		flushSync(() => {
			wrapBodyWithHnTemplate(doc, {
				footer: <div>Custom Footer</div>,
			});
		});

		const footer = doc.querySelector('.oj-hn-footer');
		expect(footer?.textContent).toContain('Custom Footer');
	});
});
