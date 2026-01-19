import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { dom } from './dom.ts';

const loggedInHtml = readFileSync(join(__dirname, '__fixtures__', 'hn-logged-in.html'), 'utf-8');
const loggedOutHtml = readFileSync(join(__dirname, '__fixtures__', 'hn-logged-out.html'), 'utf-8');

describe('getUsername', () => {
	it('should return username when logged in', () => {
		document.body.innerHTML = loggedInHtml;

		const username = dom.getUsername(document);

		expect(username).toBe('testuser');
	});

	it('should return undefined when logged out', () => {
		document.body.innerHTML = loggedOutHtml;

		const username = dom.getUsername(document);

		expect(username).toBeUndefined();
	});

	it('should return undefined when pagetop is missing', () => {
		document.body.innerHTML = '<div>No pagetop here</div>';

		const username = dom.getUsername(document);

		expect(username).toBeUndefined();
	});
});
