import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getUserInfo } from '@/utils/api.ts';
import { showUserInfoOnHover } from './show-user-info-hover.ts';

vi.mock('@/utils/api.ts', () => ({
	getUserInfo: vi.fn(),
}));

const MOCK_CONTEXT = {
	onInvalidated: vi.fn(),
} as any;

const createUserAnchor = (doc: Document, username: string): HTMLAnchorElement => {
	const anchor = doc.createElement('a');
	anchor.className = 'hnuser';
	anchor.textContent = username;
	const container = doc.createElement('div');
	container.appendChild(anchor);
	doc.body.appendChild(container);
	return anchor;
};

describe('showUserInfoOnHover', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should add style element to document head', () => {
		const doc = document.implementation.createHTMLDocument();
		const users = doc.querySelectorAll<HTMLAnchorElement>('a.hnuser');

		showUserInfoOnHover(doc, MOCK_CONTEXT, users);

		const styleElement = doc.head.querySelector('style');
		expect(styleElement).not.toBeNull();
		expect(styleElement?.textContent).toContain('.oj_user_info_hover');
	});

	it('should create hover div on mouseenter', async () => {
		const doc = document.implementation.createHTMLDocument();
		const user = createUserAnchor(doc, 'testuser');
		const users = doc.querySelectorAll<HTMLAnchorElement>('a.hnuser');

		vi.mocked(getUserInfo).mockResolvedValue({
			id: 'testuser',
			created: 1_609_459_200,
			karma: 100,
			submitted: [1, 2, 3],
		});

		showUserInfoOnHover(doc, MOCK_CONTEXT, users);

		const event = new Event('mouseenter');
		user.dispatchEvent(event);

		await vi.waitFor(() => {
			const hoverDiv = user.parentElement?.querySelector('.oj_user_info_hover');
			expect(hoverDiv).not.toBeNull();
		});
	});

	it('should populate user info on first hover', async () => {
		const doc = document.implementation.createHTMLDocument();
		const user = createUserAnchor(doc, 'testuser');
		const users = doc.querySelectorAll<HTMLAnchorElement>('a.hnuser');

		vi.mocked(getUserInfo).mockResolvedValue({
			id: 'testuser',
			created: 1_609_459_200,
			karma: 100,
			submitted: [1, 2, 3],
		});

		showUserInfoOnHover(doc, MOCK_CONTEXT, users);

		const event = new Event('mouseenter');
		user.dispatchEvent(event);

		await vi.waitFor(() => {
			const hoverDiv = user.parentElement?.querySelector('.oj_user_info_hover');
			expect(hoverDiv?.innerHTML).toContain('testuser');
			expect(hoverDiv?.innerHTML).toContain('100');
			expect(hoverDiv?.innerHTML).toContain('3');
		});
	});

	it('should not fetch user info on subsequent hovers', async () => {
		const doc = document.implementation.createHTMLDocument();
		const user = createUserAnchor(doc, 'testuser');
		const users = doc.querySelectorAll<HTMLAnchorElement>('a.hnuser');

		const getUserInfoSpy = vi.mocked(getUserInfo).mockResolvedValue({
			id: 'testuser',
			created: 1_609_459_200,
			karma: 100,
			submitted: [1, 2, 3],
		});

		showUserInfoOnHover(doc, MOCK_CONTEXT, users);

		user.dispatchEvent(new Event('mouseenter'));
		await vi.waitFor(() => {
			expect(getUserInfoSpy).toHaveBeenCalledTimes(1);
		});

		user.dispatchEvent(new Event('mouseleave'));
		user.dispatchEvent(new Event('mouseenter'));
		await vi.waitFor(() => {
			expect(getUserInfoSpy).toHaveBeenCalledTimes(1);
		});
	});

	it('should show green color for users less than a month old', async () => {
		const doc = document.implementation.createHTMLDocument();
		const user = createUserAnchor(doc, 'newuser');
		const users = doc.querySelectorAll<HTMLAnchorElement>('a.hnuser');

		const recentTimestamp = Math.floor((Date.now() - 10 * 24 * 60 * 60 * 1000) / 1000);

		vi.mocked(getUserInfo).mockResolvedValue({
			id: 'newuser',
			created: recentTimestamp,
			karma: 50,
			submitted: [1],
		});

		showUserInfoOnHover(doc, MOCK_CONTEXT, users);

		user.dispatchEvent(new Event('mouseenter'));

		await vi.waitFor(() => {
			const hoverDiv = user.parentElement?.querySelector('.oj_user_info_hover');
			expect(hoverDiv?.innerHTML).toContain('#3c963c');
		});
	});

	it('should not show green color for users older than a month', async () => {
		const doc = document.implementation.createHTMLDocument();
		const user = createUserAnchor(doc, 'olduser');
		const users = doc.querySelectorAll<HTMLAnchorElement>('a.hnuser');

		const oldTimestamp = Math.floor((Date.now() - 60 * 24 * 60 * 60 * 1000) / 1000);

		vi.mocked(getUserInfo).mockResolvedValue({
			id: 'olduser',
			created: oldTimestamp,
			karma: 500,
			submitted: [1, 2, 3, 4, 5],
		});

		showUserInfoOnHover(doc, MOCK_CONTEXT, users);

		user.dispatchEvent(new Event('mouseenter'));

		await vi.waitFor(() => {
			const hoverDiv = user.parentElement?.querySelector('.oj_user_info_hover');
			expect(hoverDiv?.innerHTML).not.toContain('#3c963c');
		});
	});

	it('should include about section when present', async () => {
		const doc = document.implementation.createHTMLDocument();
		const user = createUserAnchor(doc, 'testuser');
		const users = doc.querySelectorAll<HTMLAnchorElement>('a.hnuser');

		vi.mocked(getUserInfo).mockResolvedValue({
			id: 'testuser',
			created: 1_609_459_200,
			karma: 100,
			submitted: [1, 2, 3],
			about: 'Test about section',
		});

		showUserInfoOnHover(doc, MOCK_CONTEXT, users);

		user.dispatchEvent(new Event('mouseenter'));

		await vi.waitFor(() => {
			const hoverDiv = user.parentElement?.querySelector('.oj_user_info_hover');
			expect(hoverDiv?.innerHTML).toContain('about:');
			expect(hoverDiv?.innerHTML).toContain('Test about section');
		});
	});

	it('should not include about section when absent', async () => {
		const doc = document.implementation.createHTMLDocument();
		const user = createUserAnchor(doc, 'testuser');
		const users = doc.querySelectorAll<HTMLAnchorElement>('a.hnuser');

		vi.mocked(getUserInfo).mockResolvedValue({
			id: 'testuser',
			created: 1_609_459_200,
			karma: 100,
			submitted: [1, 2, 3],
		});

		showUserInfoOnHover(doc, MOCK_CONTEXT, users);

		user.dispatchEvent(new Event('mouseenter'));

		await vi.waitFor(() => {
			const hoverDiv = user.parentElement?.querySelector('.oj_user_info_hover');
			expect(hoverDiv?.innerHTML).not.toContain('about:');
		});
	});

	it('should hide hover div after mouseleave with delay', async () => {
		const doc = document.implementation.createHTMLDocument();
		const user = createUserAnchor(doc, 'testuser');
		const users = doc.querySelectorAll<HTMLAnchorElement>('a.hnuser');

		vi.mocked(getUserInfo).mockResolvedValue({
			id: 'testuser',
			created: 1_609_459_200,
			karma: 100,
			submitted: [1, 2, 3],
		});

		showUserInfoOnHover(doc, MOCK_CONTEXT, users);

		user.dispatchEvent(new Event('mouseenter'));

		await vi.waitFor(() => {
			const hoverDiv =
				user.parentElement?.querySelector<HTMLDivElement>('.oj_user_info_hover');
			expect(hoverDiv?.style.display).toBe('block');
		});

		user.dispatchEvent(new Event('mouseleave'));

		await vi.waitFor(() => {
			const hoverDiv =
				user.parentElement?.querySelector<HTMLDivElement>('.oj_user_info_hover');
			expect(hoverDiv?.style.display).toBe('none');
		});
	});

	it('should register cleanup on context invalidation', () => {
		const doc = document.implementation.createHTMLDocument();
		createUserAnchor(doc, 'testuser');
		const users = doc.querySelectorAll<HTMLAnchorElement>('a.hnuser');

		showUserInfoOnHover(doc, MOCK_CONTEXT, users);

		expect(MOCK_CONTEXT.onInvalidated).toHaveBeenCalled();
	});

	it('should handle multiple users', async () => {
		const doc = document.implementation.createHTMLDocument();
		const user1 = createUserAnchor(doc, 'user1');
		const user2 = createUserAnchor(doc, 'user2');
		const users = doc.querySelectorAll<HTMLAnchorElement>('a.hnuser');

		vi.mocked(getUserInfo).mockImplementation(async (username) => ({
			id: username || '',
			created: 1_609_459_200,
			karma: 100,
			submitted: [1, 2, 3],
		}));

		showUserInfoOnHover(doc, MOCK_CONTEXT, users);

		user1.dispatchEvent(new Event('mouseenter'));
		user2.dispatchEvent(new Event('mouseenter'));

		await vi.waitFor(() => {
			const hoverDiv1 = user1.parentElement?.querySelector('.oj_user_info_hover');
			const hoverDiv2 = user2.parentElement?.querySelector('.oj_user_info_hover');
			expect(hoverDiv1?.innerHTML).toContain('user1');
			expect(hoverDiv2?.innerHTML).toContain('user2');
		});
	});

	it('should handle null getUserInfo response', async () => {
		const doc = document.implementation.createHTMLDocument();
		const user = createUserAnchor(doc, 'testuser');
		const users = doc.querySelectorAll<HTMLAnchorElement>('a.hnuser');

		vi.mocked(getUserInfo).mockResolvedValue(null);

		showUserInfoOnHover(doc, MOCK_CONTEXT, users);

		user.dispatchEvent(new Event('mouseenter'));

		await vi.waitFor(() => {
			const hoverDiv = user.parentElement?.querySelector('.oj_user_info_hover');
			expect(hoverDiv?.innerHTML).toBe('');
		});
	});

	it('should prevent FOUS by hiding div during fetch', async () => {
		const doc = document.implementation.createHTMLDocument();
		const user = createUserAnchor(doc, 'testuser');
		const users = doc.querySelectorAll<HTMLAnchorElement>('a.hnuser');

		let getUserInfoCalled = false;
		// biome-ignore lint/suspicious/useAwait: mocks
		vi.mocked(getUserInfo).mockImplementation(async () => {
			getUserInfoCalled = true;
			return {
				id: 'testuser',
				created: 1_609_459_200,
				karma: 100,
				submitted: [1, 2, 3],
			};
		});

		showUserInfoOnHover(doc, MOCK_CONTEXT, users);
		user.dispatchEvent(new Event('mouseenter'));

		await vi.waitFor(() => {
			expect(getUserInfoCalled).toBe(true);
		});

		const hoverDiv = user.parentElement?.querySelector<HTMLDivElement>('.oj_user_info_hover');
		expect(hoverDiv?.style.display).toBe('block');
		expect(hoverDiv?.innerHTML).toContain('testuser');
	});
});
