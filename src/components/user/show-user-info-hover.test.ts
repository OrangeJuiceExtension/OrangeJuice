import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContentScriptContext } from '#imports';
import { apiModule } from '@/utils/api';
import { showUserInfoOnHover } from './show-user-info-hover';

const renderMermaidMock = vi.fn();

vi.mock('@/utils/api', () => {
	const getUserInfo = vi.fn();
	return {
		apiModule: {
			getUserInfo,
		},
		getUserInfo,
	};
});

vi.mock('linkify-html', () => ({
	default: (html: string) =>
		html.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" rel="noopener">$1</a>'),
}));

vi.mock('beautiful-mermaid', () => ({
	renderMermaid: (code: string, options?: unknown) => renderMermaidMock(code, options),
	THEMES: {
		'github-light': { bg: '#ffffff', fg: '#111111' },
		'github-dark': { bg: '#0d1117', fg: '#e6edf3' },
	},
}));

describe('showUserInfoOnHover', () => {
	let mockCtx: ContentScriptContext;
	let cleanupFunctions: Array<() => void>;

	beforeEach(() => {
		document.body.innerHTML = '';
		document.head.innerHTML = '';
		cleanupFunctions = [];
		renderMermaidMock.mockReset();

		mockCtx = {
			onInvalidated: vi.fn((callback: () => void) => {
				cleanupFunctions.push(callback);
			}),
		} as unknown as ContentScriptContext;

		vi.clearAllMocks();
	});

	const createUserLink = (userName: string): HTMLAnchorElement => {
		const link = document.createElement('a');
		link.href = `user?id=${userName}`;
		link.textContent = userName;
		link.className = 'hnuser';
		const parent = document.createElement('div');
		parent.appendChild(link);
		document.body.appendChild(parent);
		return link;
	};

	const mockUserInfo = (userName: string, overrides = {}) => {
		vi.mocked(apiModule.getUserInfo).mockResolvedValueOnce({
			id: userName,
			created: Math.floor(Date.now() / 1000) - 365 * 24 * 60 * 60, // 1 year ago
			karma: 1000,
			about: 'Test user bio',
			submitted: Array.from({ length: 50 }),
			...overrides,
		});
	};

	it('should inject styles into the document head', () => {
		showUserInfoOnHover(mockCtx, document);

		const style = Array.from(document.querySelectorAll('style')).find((item) =>
			item.textContent?.includes('.oj_user_info_hover')
		);
		expect(style).toBeTruthy();
		expect(style?.textContent).toContain('.oj_user_info_hover');
		expect(style?.textContent).toContain('position: absolute');
	});

	it('should show popover on mouseover', async () => {
		const userLink = createUserLink('testuser');
		mockUserInfo('testuser');

		showUserInfoOnHover(mockCtx, document);

		const mouseoverEvent = new MouseEvent('mouseover', { bubbles: true });
		userLink.dispatchEvent(mouseoverEvent);

		await vi.waitFor(() => {
			const popover = document.querySelector('.oj_user_info_hover.active');
			expect(popover).toBeTruthy();
		});
	});

	it('should display user information in popover', async () => {
		const userLink = createUserLink('testuser');
		mockUserInfo('testuser', {
			karma: 5000,
			submitted: Array.from({ length: 100 }),
		});

		showUserInfoOnHover(mockCtx, document);

		userLink.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

		await vi.waitFor(() => {
			const popover = document.querySelector('.oj_user_info_hover');
			expect(popover?.textContent).toContain('testuser');
			expect(popover?.textContent).toContain('5000');
			expect(popover?.textContent).toContain('100');
		});
	});

	it('should display about section when user has about text', async () => {
		const userLink = createUserLink('testuser');
		mockUserInfo('testuser', { about: 'I love programming' });

		showUserInfoOnHover(mockCtx, document);

		userLink.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

		await vi.waitFor(() => {
			const popover = document.querySelector('.oj_user_info_hover');
			expect(popover?.textContent).toContain('I love programming');
		});
	});

	it('should not display about section when user has no about text', async () => {
		const userLink = createUserLink('testuser');
		mockUserInfo('testuser', { about: undefined });

		showUserInfoOnHover(mockCtx, document);

		userLink.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

		await vi.waitFor(() => {
			const popover = document.querySelector('.oj_user_info_hover');
			const aboutRows = popover?.querySelectorAll('tr');
			const hasAbout = Array.from(aboutRows || []).some((row) =>
				row.textContent?.includes('about:')
			);
			expect(hasAbout).toBe(false);
		});
	});

	it('should highlight new users in green', async () => {
		const userLink = createUserLink('newuser');
		const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 15 * 24 * 60 * 60;
		mockUserInfo('newuser', { created: thirtyDaysAgo });

		showUserInfoOnHover(mockCtx, document);

		userLink.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

		await vi.waitFor(() => {
			const popover = document.querySelector('.oj_user_info_hover');
			const userFont = popover?.querySelector('font[color="#3c963c"]');
			expect(userFont).toBeTruthy();
			expect(userFont?.textContent).toBe('newuser');
		});
	});

	it('should not highlight old users', async () => {
		const userLink = createUserLink('olduser');
		const oneYearAgo = Math.floor(Date.now() / 1000) - 365 * 24 * 60 * 60;
		mockUserInfo('olduser', { created: oneYearAgo });

		showUserInfoOnHover(mockCtx, document);

		userLink.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

		await vi.waitFor(() => {
			const popover = document.querySelector('.oj_user_info_hover');
			const userFont = popover?.querySelector('font[color="#3c963c"]');
			expect(userFont).toBeFalsy();
		});
	});

	it('should cache user data after first fetch', async () => {
		const userLink = createUserLink('testuser');
		mockUserInfo('testuser');

		showUserInfoOnHover(mockCtx, document);

		// First mouseover
		userLink.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
		await vi.waitFor(() => {
			const popover = document.querySelector('.oj_user_info_hover');
			expect(popover?.textContent).toContain('testuser');
		});

		// Hide popover by moving mouse away
		const hideEvent = new MouseEvent('mousemove', {
			bubbles: true,
			clientX: 9999,
			clientY: 9999,
		});
		Object.defineProperty(hideEvent, 'target', {
			value: document.body,
			enumerable: true,
		});
		document.dispatchEvent(hideEvent);

		await vi.waitFor(() => {
			expect(document.querySelector('.oj_user_info_hover.active')).toBeFalsy();
		});

		// Second mouseover should use cached data
		userLink.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
		await vi.waitFor(() => {
			expect(document.querySelector('.oj_user_info_hover.active')).toBeTruthy();
		});

		// getUserInfo should only be called once
		expect(apiModule.getUserInfo).toHaveBeenCalledTimes(1);
	});

	it('should hide popover when mouse moves away', async () => {
		const userLink = createUserLink('testuser');
		mockUserInfo('testuser');

		showUserInfoOnHover(mockCtx, document);

		userLink.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

		await vi.waitFor(() => {
			expect(document.querySelector('.oj_user_info_hover.active')).toBeTruthy();
		});

		const hideEvent = new MouseEvent('mousemove', {
			bubbles: true,
			clientX: 9999,
			clientY: 9999,
		});
		Object.defineProperty(hideEvent, 'target', {
			value: document.body,
			enumerable: true,
		});
		document.dispatchEvent(hideEvent);

		await vi.waitFor(() => {
			expect(document.querySelector('.oj_user_info_hover.active')).toBeFalsy();
		});
	});

	it('should not hide popover when mouse is over trigger or popover', async () => {
		const userLink = createUserLink('testuser');
		mockUserInfo('testuser');

		userLink.getBoundingClientRect = vi.fn(() => ({
			left: 100,
			right: 200,
			top: 100,
			bottom: 120,
			width: 100,
			height: 20,
			x: 100,
			y: 100,
			toJSON: () => ({}),
		}));

		showUserInfoOnHover(mockCtx, document);

		userLink.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

		await vi.waitFor(() => {
			expect(document.querySelector('.oj_user_info_hover.active')).toBeTruthy();
		});

		// Mouse moves over the trigger
		const mouseMoveEvent = new MouseEvent('mousemove', {
			bubbles: true,
			clientX: 150,
			clientY: 110,
		});

		Object.defineProperty(mouseMoveEvent, 'target', {
			value: userLink,
			enumerable: true,
		});

		document.dispatchEvent(mouseMoveEvent);

		// Popover should still be visible
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(document.querySelector('.oj_user_info_hover.active')).toBeTruthy();
	});

	it('should not show popover when getUserInfo returns null', async () => {
		const userLink = createUserLink('testuser');
		vi.mocked(apiModule.getUserInfo).mockResolvedValueOnce(null);

		showUserInfoOnHover(mockCtx, document);

		userLink.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

		await new Promise((resolve) => setTimeout(resolve, 50));
		const popover = document.querySelector('.oj_user_info_hover');
		const table = popover?.querySelector('table');
		expect(table).toBeFalsy();
	});

	it('should handle multiple user links independently', async () => {
		const user1Link = createUserLink('user1');
		const user2Link = createUserLink('user2');

		mockUserInfo('user1', { karma: 1000 });
		mockUserInfo('user2', { karma: 2000 });

		showUserInfoOnHover(mockCtx, document);

		user1Link.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

		await vi.waitFor(() => {
			const popover = document.querySelector('.oj_user_info_hover');
			expect(popover?.textContent).toContain('1000');
		});

		const hideEvent = new MouseEvent('mousemove', {
			bubbles: true,
			clientX: 9999,
			clientY: 9999,
		});
		Object.defineProperty(hideEvent, 'target', {
			value: document.body,
			enumerable: true,
		});
		document.dispatchEvent(hideEvent);

		await vi.waitFor(() => {
			expect(document.querySelector('.oj_user_info_hover.active')).toBeFalsy();
		});

		user2Link.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

		await vi.waitFor(() => {
			const popover = document.querySelector('.oj_user_info_hover');
			expect(popover?.textContent).toContain('2000');
		});
	});

	it('should not trigger on same user link twice without hiding first', async () => {
		const userLink = createUserLink('testuser');
		mockUserInfo('testuser');

		showUserInfoOnHover(mockCtx, document);

		userLink.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

		await vi.waitFor(() => {
			expect(apiModule.getUserInfo).toHaveBeenCalledTimes(1);
		});

		// Second mouseover on the same link should be ignored
		userLink.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(apiModule.getUserInfo).toHaveBeenCalledTimes(1);
	});

	it('should show loader while fetching user data', async () => {
		const userLink = createUserLink('testuser');

		// Delay the response
		vi.mocked(apiModule.getUserInfo).mockImplementationOnce(() => {
			return new Promise((resolve) => {
				setTimeout(() => {
					resolve({
						id: 'testuser',
						created: Math.floor(Date.now() / 1000),
						karma: 1000,
						about: '',
						submitted: [],
					});
				}, 100);
			});
		});

		showUserInfoOnHover(mockCtx, document);

		userLink.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

		// Loader should appear immediately
		await vi.waitFor(() => {
			const loader = document.querySelector('.loader1');
			expect(loader).toBeTruthy();
		});
	});

	it('should remove event listeners when context is invalidated', async () => {
		const userLink = createUserLink('testuser');
		mockUserInfo('testuser');

		showUserInfoOnHover(mockCtx, document);

		expect(mockCtx.onInvalidated).toHaveBeenCalledTimes(1);

		// Trigger invalidation
		for (const cleanup of cleanupFunctions) {
			cleanup();
		}

		// After cleanup, events should not trigger popover
		userLink.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(apiModule.getUserInfo).not.toHaveBeenCalled();
	});

	it('should format date using locale formatting', async () => {
		const userLink = createUserLink('testuser');
		const testDate = new Date('2023-01-15T00:00:00Z');
		mockUserInfo('testuser', { created: Math.floor(testDate.getTime() / 1000) });

		showUserInfoOnHover(mockCtx, document);

		userLink.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

		await vi.waitFor(() => {
			const popover = document.querySelector('.oj_user_info_hover');
			const expectedDate = Intl.DateTimeFormat().format(testDate);
			expect(popover?.textContent).toContain(expectedDate);
		});
	});

	it('should render mermaid in about section', async () => {
		const userLink = createUserLink('mermaiduser');
		mockUserInfo('mermaiduser', {
			about: '<mermaid>\\nflowchart TD\\n  A --> B\\n</mermaid>',
		});
		renderMermaidMock.mockResolvedValue('<svg id="about-mermaid"></svg>');

		showUserInfoOnHover(mockCtx, document);
		userLink.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

		await vi.waitFor(() => {
			const popover = document.querySelector('.oj_user_info_hover');
			expect(popover?.innerHTML).toContain('about-mermaid');
		});

		expect(renderMermaidMock).toHaveBeenCalledWith(
			expect.stringContaining('flowchart TD'),
			expect.objectContaining({ bg: '#ffffff' })
		);
	});

	it('should render mermaid when about is code-wrapped mermaid text', async () => {
		const userLink = createUserLink('wrappedmermaiduser');
		mockUserInfo('wrappedmermaiduser', {
			about: '<pre><code>&lt;mermaid&gt;\\nflowchart TD\\n  A --&gt; B\\n&lt;/mermaid&gt;</code></pre>',
		});
		renderMermaidMock.mockResolvedValue('<svg id="about-code-mermaid"></svg>');

		showUserInfoOnHover(mockCtx, document);
		userLink.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

		await vi.waitFor(() => {
			const popover = document.querySelector('.oj_user_info_hover');
			expect(popover?.innerHTML).toContain('about-code-mermaid');
			expect(popover?.querySelector('pre')).toBeNull();
			expect(popover?.querySelector('code')).toBeNull();
		});
	});

	it('should keep plain url text linkified when rendering mermaid in about', async () => {
		const userLink = createUserLink('linkifiedmermaiduser');
		mockUserInfo('linkifiedmermaiduser', {
			about: 'https://oj-hn.com<p></p><mermaid>flowchart TD\\n  A --&gt; B</mermaid>',
		});
		renderMermaidMock.mockResolvedValue('<svg id="about-link-mermaid"></svg>');

		showUserInfoOnHover(mockCtx, document);
		userLink.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

		await vi.waitFor(() => {
			const popover = document.querySelector('.oj_user_info_hover');
			const aboutLink = popover?.querySelector('a[href*="oj-hn.com"]');
			expect(aboutLink).toBeTruthy();
			expect(popover?.innerHTML).toContain('about-link-mermaid');
		});
	});

	it('should use dark mermaid theme in hover when dark mode is active', async () => {
		document.documentElement.classList.add('oj-dark-mode');
		const userLink = createUserLink('darkmermaiduser');
		mockUserInfo('darkmermaiduser', {
			about: '<mermaid>\\nflowchart TD\\n  A --> B\\n</mermaid>',
		});
		renderMermaidMock.mockResolvedValue('<svg id="about-dark-mermaid"></svg>');

		showUserInfoOnHover(mockCtx, document);
		userLink.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

		await vi.waitFor(() => {
			const popover = document.querySelector('.oj_user_info_hover');
			expect(popover?.innerHTML).toContain('about-dark-mermaid');
		});

		expect(renderMermaidMock).toHaveBeenCalledWith(
			expect.stringContaining('flowchart TD'),
			expect.objectContaining({ bg: '#0d1117' })
		);
	});
});
