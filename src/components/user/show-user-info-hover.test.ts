import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContentScriptContext } from '#imports';
import { getUserInfo } from '@/utils/api';
import { showUserInfoOnHover } from './show-user-info-hover';

vi.mock('@/utils/api', () => ({
	getUserInfo: vi.fn(),
}));

vi.mock('linkify-html', () => ({
	default: (html: string) => html,
}));

describe('showUserInfoOnHover', () => {
	let mockCtx: ContentScriptContext;
	let cleanupFunctions: Array<() => void>;

	beforeEach(() => {
		document.body.innerHTML = '';
		document.head.innerHTML = '';
		cleanupFunctions = [];

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
		vi.mocked(getUserInfo).mockResolvedValueOnce({
			id: userName,
			created: Math.floor(Date.now() / 1000) - 365 * 24 * 60 * 60, // 1 year ago
			karma: 1000,
			about: 'Test user bio',
			submitted: Array.from({ length: 50 }),
			...overrides,
		});
	};

	it('should inject styles into the document head', () => {
		showUserInfoOnHover(document, mockCtx);

		const style = document.querySelector('style');
		expect(style).toBeTruthy();
		expect(style?.textContent).toContain('.oj_user_info_hover');
		expect(style?.textContent).toContain('position: absolute');
	});

	it('should show popover on mouseover', async () => {
		const userLink = createUserLink('testuser');
		mockUserInfo('testuser');

		showUserInfoOnHover(document, mockCtx);

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

		showUserInfoOnHover(document, mockCtx);

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

		showUserInfoOnHover(document, mockCtx);

		userLink.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

		await vi.waitFor(() => {
			const popover = document.querySelector('.oj_user_info_hover');
			expect(popover?.textContent).toContain('I love programming');
		});
	});

	it('should not display about section when user has no about text', async () => {
		const userLink = createUserLink('testuser');
		mockUserInfo('testuser', { about: undefined });

		showUserInfoOnHover(document, mockCtx);

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

		showUserInfoOnHover(document, mockCtx);

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

		showUserInfoOnHover(document, mockCtx);

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

		showUserInfoOnHover(document, mockCtx);

		// First mouseover
		userLink.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
		await vi.waitFor(() => {
			expect(document.querySelector('.oj_user_info_hover')).toBeTruthy();
		});

		// Hide popover by moving mouse away
		document.dispatchEvent(
			new MouseEvent('mousemove', {
				bubbles: true,
				clientX: 9999,
				clientY: 9999,
			})
		);

		await vi.waitFor(() => {
			expect(document.querySelector('.oj_user_info_hover.active')).toBeFalsy();
		});

		// Second mouseover should use cached data
		userLink.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
		await vi.waitFor(() => {
			expect(document.querySelector('.oj_user_info_hover.active')).toBeTruthy();
		});

		// getUserInfo should only be called once
		expect(getUserInfo).toHaveBeenCalledTimes(1);
	});

	it('should hide popover when mouse moves away', async () => {
		const userLink = createUserLink('testuser');
		mockUserInfo('testuser');

		showUserInfoOnHover(document, mockCtx);

		userLink.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

		await vi.waitFor(() => {
			expect(document.querySelector('.oj_user_info_hover.active')).toBeTruthy();
		});

		document.dispatchEvent(
			new MouseEvent('mousemove', {
				bubbles: true,
				clientX: 9999,
				clientY: 9999,
			})
		);

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

		showUserInfoOnHover(document, mockCtx);

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
		vi.mocked(getUserInfo).mockResolvedValueOnce(null);

		showUserInfoOnHover(document, mockCtx);

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

		showUserInfoOnHover(document, mockCtx);

		user1Link.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

		await vi.waitFor(() => {
			const popover = document.querySelector('.oj_user_info_hover');
			expect(popover?.textContent).toContain('1000');
		});

		document.dispatchEvent(
			new MouseEvent('mousemove', {
				bubbles: true,
				clientX: 9999,
				clientY: 9999,
			})
		);

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

		showUserInfoOnHover(document, mockCtx);

		userLink.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

		await vi.waitFor(() => {
			expect(getUserInfo).toHaveBeenCalledTimes(1);
		});

		// Second mouseover on the same link should be ignored
		userLink.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(getUserInfo).toHaveBeenCalledTimes(1);
	});

	it('should show loader while fetching user data', async () => {
		const userLink = createUserLink('testuser');

		// Delay the response
		vi.mocked(getUserInfo).mockImplementationOnce(() => {
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

		showUserInfoOnHover(document, mockCtx);

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

		showUserInfoOnHover(document, mockCtx);

		expect(mockCtx.onInvalidated).toHaveBeenCalledTimes(1);

		// Trigger invalidation
		for (const cleanup of cleanupFunctions) {
			cleanup();
		}

		// After cleanup, events should not trigger popover
		userLink.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(getUserInfo).not.toHaveBeenCalled();
	});

	it('should format date using locale formatting', async () => {
		const userLink = createUserLink('testuser');
		const testDate = new Date('2023-01-15T00:00:00Z');
		mockUserInfo('testuser', { created: Math.floor(testDate.getTime() / 1000) });

		showUserInfoOnHover(document, mockCtx);

		userLink.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

		await vi.waitFor(() => {
			const popover = document.querySelector('.oj_user_info_hover');
			const expectedDate = Intl.DateTimeFormat().format(testDate);
			expect(popover?.textContent).toContain(expectedDate);
		});
	});
});
