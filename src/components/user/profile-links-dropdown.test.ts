import { beforeEach, describe, expect, it, vi } from 'vitest';
import { profileLinksDropdown } from './profile-links-dropdown.ts';

const MOCK_CONTEXT = {
	onInvalidated: vi.fn(),
} as any;

const createPageTop = (doc: Document, username: string): HTMLElement => {
	const table = doc.createElement('table');
	const tr = doc.createElement('tr');
	const td = doc.createElement('td');
	const span = doc.createElement('span');
	span.className = 'pagetop';

	const userLink = doc.createElement('a');
	userLink.id = 'me';
	userLink.textContent = username;
	userLink.href = `user?id=${username}`;

	span.appendChild(userLink);
	span.appendChild(doc.createTextNode(' (1234) | '));
	const logoutLink = doc.createElement('a');
	logoutLink.href = 'logout';
	logoutLink.textContent = 'logout';
	span.appendChild(logoutLink);
	td.appendChild(span);
	tr.appendChild(td);
	table.appendChild(tr);
	doc.body.appendChild(table);

	return span;
};

describe('profileLinksDropdown', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should not run on /user pages', () => {
		const doc = document.implementation.createHTMLDocument();
		const originalPathname = window.location.pathname;

		Object.defineProperty(window, 'location', {
			value: { pathname: '/user' },
			writable: true,
		});

		profileLinksDropdown(MOCK_CONTEXT, doc);

		const styleElement = doc.head.querySelector('style');
		expect(styleElement).toBeNull();

		Object.defineProperty(window, 'location', {
			value: { pathname: originalPathname },
			writable: true,
		});
	});

	it('should require at least 2 pagetop elements', () => {
		const doc = document.implementation.createHTMLDocument();
		const span = doc.createElement('span');
		span.className = 'pagetop';
		doc.body.appendChild(span);

		profileLinksDropdown(MOCK_CONTEXT, doc);

		const styleElement = doc.head.querySelector('style');
		expect(styleElement).toBeNull();
	});

	it('should require a user link in the second pagetop', () => {
		const doc = document.implementation.createHTMLDocument();

		for (const _i of [0, 1]) {
			const span = doc.createElement('span');
			span.className = 'pagetop';
			doc.body.appendChild(span);
		}

		profileLinksDropdown(MOCK_CONTEXT, doc);

		const styleElement = doc.head.querySelector('style');
		expect(styleElement).toBeNull();
	});

	it('should add style element to document head', () => {
		const doc = document.implementation.createHTMLDocument();
		createPageTop(doc, 'testuser');
		createPageTop(doc, 'testuser');

		profileLinksDropdown(MOCK_CONTEXT, doc);

		const styleElement = doc.head.querySelector('style');
		expect(styleElement).not.toBeNull();
		expect(styleElement?.innerHTML).toContain('.oj_profile_dropdown');
	});

	it('should create dropdown with correct links', () => {
		const doc = document.implementation.createHTMLDocument();
		createPageTop(doc, 'testuser');
		createPageTop(doc, 'testuser');

		profileLinksDropdown(MOCK_CONTEXT, doc);

		const dropdown = doc.querySelector<HTMLDivElement>('.oj_profile_dropdown');
		expect(dropdown).not.toBeNull();

		const links = dropdown?.querySelectorAll('a');
		expect(links?.length).toBe(11);

		const expectedLinks = [
			{ title: 'profile', path: 'user?id=testuser' },
			{ title: 'submissions', path: 'submitted?id=testuser' },
			{ title: 'comments', path: 'threads?id=testuser' },
			{ title: 'hidden', path: 'hidden' },
			{ title: 'flagged submissions', path: 'flagged?id=testuser' },
			{ title: 'flagged comments', path: 'flagged?id=testuser&kind=comment' },
			{ title: 'upvoted submissions', path: 'upvoted?id=testuser' },
			{ title: 'upvoted comments', path: 'upvoted?id=testuser&comments=t' },
			{ title: 'favorite submissions', path: 'favorites?id=testuser' },
			{ title: 'favorite comments', path: 'favorites?id=testuser&comments=t' },
			{ title: 'logout', path: 'logout' },
		];

		for (const [index, link] of expectedLinks.entries()) {
			expect(links?.[index].innerHTML).toBe(link.title);
			expect(links?.[index].href).toContain(link.path);
		}
	});

	it('should remove logout from top nav and trailing separator', () => {
		const doc = document.implementation.createHTMLDocument();
		createPageTop(doc, 'testuser');
		createPageTop(doc, 'testuser');

		profileLinksDropdown(MOCK_CONTEXT, doc);

		const pagetops = doc.querySelectorAll('span.pagetop');
		const topUserBar = pagetops[1];
		expect(topUserBar?.textContent).not.toContain('logout');
		expect(topUserBar?.textContent?.trim().endsWith('|')).toBe(false);
	});

	it('should append arrow indicator to username', () => {
		const doc = document.implementation.createHTMLDocument();
		createPageTop(doc, 'testuser');
		createPageTop(doc, 'testuser');

		profileLinksDropdown(MOCK_CONTEXT, doc);

		const pagetops = doc.querySelectorAll('span.pagetop');
		const userLink = pagetops[1].querySelector<HTMLAnchorElement>('a#me');
		expect(userLink?.innerHTML).toContain('▾');
	});

	it('should toggle dropdown on click', () => {
		const doc = document.implementation.createHTMLDocument();
		createPageTop(doc, 'testuser');
		createPageTop(doc, 'testuser');

		profileLinksDropdown(MOCK_CONTEXT, doc);

		const pagetops = doc.querySelectorAll('span.pagetop');
		const userLink = pagetops[1].querySelector<HTMLAnchorElement>('a#me');
		const dropdown = doc.querySelector<HTMLDivElement>('.oj_profile_dropdown');

		expect(dropdown?.classList.contains('active')).toBe(false);

		const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
		Object.defineProperty(clickEvent, 'preventDefault', { value: vi.fn() });
		Object.defineProperty(clickEvent, 'stopPropagation', { value: vi.fn() });
		vi.spyOn(userLink as HTMLAnchorElement, 'getBoundingClientRect').mockReturnValue({
			left: 100,
		} as DOMRect);

		userLink?.dispatchEvent(clickEvent);

		expect(dropdown?.classList.contains('active')).toBe(true);
		expect(userLink?.innerHTML).toContain('▴');

		userLink?.dispatchEvent(clickEvent);

		expect(dropdown?.classList.contains('active')).toBe(false);
		expect(userLink?.innerHTML).toContain('▾');
	});

	it('should not toggle dropdown on modified click', () => {
		const doc = document.implementation.createHTMLDocument();
		createPageTop(doc, 'testuser');
		createPageTop(doc, 'testuser');

		profileLinksDropdown(MOCK_CONTEXT, doc);

		const pagetops = doc.querySelectorAll('span.pagetop');
		const userLink = pagetops[1].querySelector<HTMLAnchorElement>('a#me');
		const dropdown = doc.querySelector<HTMLDivElement>('.oj_profile_dropdown');

		expect(dropdown?.classList.contains('active')).toBe(false);

		const clickEvent = new MouseEvent('click', {
			bubbles: true,
			cancelable: true,
			metaKey: true,
		});

		userLink?.dispatchEvent(clickEvent);

		expect(dropdown?.classList.contains('active')).toBe(false);
	});

	it('should update dropdown position on resize', () => {
		const doc = document.implementation.createHTMLDocument();
		createPageTop(doc, 'testuser');
		createPageTop(doc, 'testuser');

		profileLinksDropdown(MOCK_CONTEXT, doc);

		const pagetops = doc.querySelectorAll('span.pagetop');
		const userLink = pagetops[1].querySelector<HTMLAnchorElement>('a#me');
		const dropdown = doc.querySelector<HTMLDivElement>('.oj_profile_dropdown');

		const getBoundingClientRectSpy = vi
			.spyOn(userLink as HTMLAnchorElement, 'getBoundingClientRect')
			.mockReturnValue({ left: 100 } as DOMRect);

		const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
		Object.defineProperty(clickEvent, 'preventDefault', { value: vi.fn() });
		Object.defineProperty(clickEvent, 'stopPropagation', { value: vi.fn() });

		userLink?.dispatchEvent(clickEvent);

		expect(dropdown?.style.left).toBe('100px');

		getBoundingClientRectSpy.mockReturnValue({ left: 200 } as DOMRect);

		window.dispatchEvent(new Event('resize'));

		expect(dropdown?.style.left).toBe('200px');
	});

	it('should not update dropdown position on resize when closed', () => {
		const doc = document.implementation.createHTMLDocument();
		createPageTop(doc, 'testuser');
		createPageTop(doc, 'testuser');

		profileLinksDropdown(MOCK_CONTEXT, doc);

		const pagetops = doc.querySelectorAll('span.pagetop');
		const userLink = pagetops[1].querySelector<HTMLAnchorElement>('a#me');
		const dropdown = doc.querySelector<HTMLDivElement>('.oj_profile_dropdown');

		vi.spyOn(userLink as HTMLAnchorElement, 'getBoundingClientRect').mockReturnValue({
			left: 100,
		} as DOMRect);

		expect(dropdown?.style.left).toBe('');

		window.dispatchEvent(new Event('resize'));

		expect(dropdown?.style.left).toBe('');
	});

	it('should register cleanup on context invalidation', () => {
		const doc = document.implementation.createHTMLDocument();
		createPageTop(doc, 'testuser');
		createPageTop(doc, 'testuser');

		profileLinksDropdown(MOCK_CONTEXT, doc);

		expect(MOCK_CONTEXT.onInvalidated).toHaveBeenCalled();
	});

	it('should clean up event listeners on invalidation', () => {
		const doc = document.implementation.createHTMLDocument();
		createPageTop(doc, 'testuser');
		createPageTop(doc, 'testuser');

		const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

		profileLinksDropdown(MOCK_CONTEXT, doc);

		const pagetops = doc.querySelectorAll('span.pagetop');
		const userLink = pagetops[1].querySelector<HTMLAnchorElement>('a#me');
		const userLinkSpy = vi.spyOn(userLink as HTMLAnchorElement, 'removeEventListener');

		const onInvalidatedCallback = MOCK_CONTEXT.onInvalidated.mock.calls[0][0];
		onInvalidatedCallback();

		expect(userLinkSpy).toHaveBeenCalledWith('click', expect.any(Function));
		expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
	});

	it('should hide dropdown initially', () => {
		const doc = document.implementation.createHTMLDocument();
		createPageTop(doc, 'testuser');
		createPageTop(doc, 'testuser');

		profileLinksDropdown(MOCK_CONTEXT, doc);

		const dropdown = doc.querySelector<HTMLDivElement>('.oj_profile_dropdown');
		expect(dropdown?.classList.contains('active')).toBe(false);
	});

	it('should close dropdown when clicking outside', () => {
		const doc = document.implementation.createHTMLDocument();
		createPageTop(doc, 'testuser');
		createPageTop(doc, 'testuser');

		profileLinksDropdown(MOCK_CONTEXT, doc);

		const pagetops = doc.querySelectorAll('span.pagetop');
		const userLink = pagetops[1].querySelector<HTMLAnchorElement>('a#me');
		const dropdown = doc.querySelector<HTMLDivElement>('.oj_profile_dropdown');

		vi.spyOn(userLink as HTMLAnchorElement, 'getBoundingClientRect').mockReturnValue({
			left: 100,
		} as DOMRect);

		const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
		Object.defineProperty(clickEvent, 'preventDefault', { value: vi.fn() });
		Object.defineProperty(clickEvent, 'stopPropagation', { value: vi.fn() });

		userLink?.dispatchEvent(clickEvent);

		expect(dropdown?.classList.contains('active')).toBe(true);
		expect(userLink?.innerHTML).toContain('▴');

		const outsideElement = doc.createElement('div');
		doc.body.appendChild(outsideElement);
		const outsideClickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
		Object.defineProperty(outsideClickEvent, 'target', { value: outsideElement });

		doc.dispatchEvent(outsideClickEvent);

		expect(dropdown?.classList.contains('active')).toBe(false);
		expect(userLink?.innerHTML).toContain('▾');
	});

	it('should not close dropdown when clicking inside dropdown', () => {
		const doc = document.implementation.createHTMLDocument();
		createPageTop(doc, 'testuser');
		createPageTop(doc, 'testuser');

		profileLinksDropdown(MOCK_CONTEXT, doc);

		const pagetops = doc.querySelectorAll('span.pagetop');
		const userLink = pagetops[1].querySelector<HTMLAnchorElement>('a#me');
		const dropdown = doc.querySelector<HTMLDivElement>('.oj_profile_dropdown');

		vi.spyOn(userLink as HTMLAnchorElement, 'getBoundingClientRect').mockReturnValue({
			left: 100,
		} as DOMRect);

		const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
		Object.defineProperty(clickEvent, 'preventDefault', { value: vi.fn() });
		Object.defineProperty(clickEvent, 'stopPropagation', { value: vi.fn() });

		userLink?.dispatchEvent(clickEvent);

		expect(dropdown?.classList.contains('active')).toBe(true);

		const dropdownLink = dropdown?.querySelector('a');
		const insideClickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
		Object.defineProperty(insideClickEvent, 'target', { value: dropdownLink });

		doc.dispatchEvent(insideClickEvent);

		expect(dropdown?.classList.contains('active')).toBe(true);
	});

	it('should not close dropdown when clicking on user link', () => {
		const doc = document.implementation.createHTMLDocument();
		createPageTop(doc, 'testuser');
		createPageTop(doc, 'testuser');

		profileLinksDropdown(MOCK_CONTEXT, doc);

		const pagetops = doc.querySelectorAll('span.pagetop');
		const userLink = pagetops[1].querySelector<HTMLAnchorElement>('a#me');
		const dropdown = doc.querySelector<HTMLDivElement>('.oj_profile_dropdown');

		vi.spyOn(userLink as HTMLAnchorElement, 'getBoundingClientRect').mockReturnValue({
			left: 100,
		} as DOMRect);

		const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
		Object.defineProperty(clickEvent, 'preventDefault', { value: vi.fn() });
		Object.defineProperty(clickEvent, 'stopPropagation', { value: vi.fn() });

		userLink?.dispatchEvent(clickEvent);

		expect(dropdown?.classList.contains('active')).toBe(true);

		const userLinkClickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
		Object.defineProperty(userLinkClickEvent, 'target', { value: userLink });

		doc.dispatchEvent(userLinkClickEvent);

		expect(dropdown?.classList.contains('active')).toBe(true);
	});
});
