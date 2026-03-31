import { waitFor } from '@testing-library/dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { follow } from '@/components/follow/index.ts';
import { apiModule, type HNUser } from '@/utils/api.ts';
import { getFollowedUsers, setFollowedUsers } from '@/utils/followed-users.ts';
import {
	isFollowingSectionExpanded,
	setCachedFollowingSection,
	setFollowingSectionExpanded,
} from '@/utils/following-cache.ts';
import lStorage from '@/utils/local-storage.ts';

vi.mock('@/utils/api.ts', async () => {
	const actual = await vi.importActual<typeof import('@/utils/api.ts')>('@/utils/api.ts');
	return {
		...actual,
		apiModule: {
			...actual.apiModule,
			getItemInfo: vi.fn(),
			getUserInfo: vi.fn(),
		},
	};
});

describe('follow component', () => {
	const mockContext = {
		onInvalidated: vi.fn(),
	} as any;

	beforeEach(async () => {
		document.head.innerHTML = '';
		document.body.innerHTML = '';
		window.history.pushState({}, '', '/news');
		follow.username = 'viewer';
		await lStorage.clear();
		await setFollowedUsers([]);
		vi.clearAllMocks();
	});

	it('adds follow buttons next to hnuser links and syncs duplicate usernames', async () => {
		document.body.innerHTML = `
			<div>
				<a href="user?id=pg" class="hnuser">pg</a>
				<a href="user?id=pg" class="hnuser">pg</a>
			</div>
		`;

		await follow.main(mockContext);

		const buttons = Array.from(
			document.querySelectorAll<HTMLButtonElement>('.oj-follow-button')
		);
		expect(buttons).toHaveLength(2);
		expect(buttons[0]?.getAttribute('aria-label')).toBe('Follow pg');
		expect(buttons[1]?.getAttribute('aria-label')).toBe('Follow pg');
		expect(buttons[0]?.querySelector('.oj-follow-icon')).toBeTruthy();

		buttons[0]?.click();

		await waitFor(() => {
			expect(buttons[0]?.getAttribute('aria-label')).toBe('Unfollow pg');
			expect(buttons[1]?.getAttribute('aria-label')).toBe('Unfollow pg');
		});
	});

	it('renders the followed activity page on /following', async () => {
		window.history.pushState({}, '', '/following');
		await setFollowedUsers(['alice']);
		await setFollowingSectionExpanded('alice', true);

		document.body.innerHTML = `
			<center>
				<table id="hnmain">
					<tbody>
						<tr><td bgcolor="#ff6600"></td></tr>
						<tr>
							<td>
								<table><tbody><tr><td><span class="pagetop"><a id="me" href="user?id=viewer">viewer</a></span></td></tr></tbody></table>
							</td>
						</tr>
						<tr><td>missing page</td></tr>
						<tr>
							<td>
								<center><span class="yclinks"><a href="lists">Lists</a></span></center>
							</td>
						</tr>
					</tbody>
				</table>
			</center>
		`;

		vi.mocked(apiModule.getUserInfo).mockResolvedValue({
			about: '',
			created: 1,
			id: 'alice',
			karma: 420,
			submitted: [1001, 1002],
		});
		vi.mocked(apiModule.getItemInfo)
			.mockResolvedValueOnce({
				by: 'alice',
				descendants: 12,
				id: 1001,
				score: 99,
				time: 1_700_000_000,
				title: 'An external post',
				type: 'story',
				url: 'https://example.com/post',
			})
			.mockResolvedValueOnce({
				by: 'alice',
				id: 1002,
				parent: 2000,
				text: '<p>Hello <strong>HN</strong></p>',
				time: 1_700_000_100,
				type: 'comment',
			})
			.mockResolvedValueOnce({
				by: 'hn',
				id: 2000,
				time: 1_699_999_900,
				title: 'Comment parent story',
				type: 'story',
				url: 'https://example.com/parent-story',
			});
		await follow.main(mockContext);

		expect(document.getElementById('oj-following-root')).toBeTruthy();
		expect(document.body.textContent).toContain('Following');
		expect(document.body.textContent).toContain('alice');
		expect(document.body.textContent).toContain('An external post');
		expect(document.body.textContent).toContain('Hello HN');
		const commentTitleLinks = Array.from(
			document.querySelectorAll<HTMLAnchorElement>('.oj-following__title-cell a')
		).filter((link) => link.textContent === 'Comment parent story');
		expect(commentTitleLinks.map((link) => [link.textContent, link.href])).toEqual([
			['Comment parent story', 'https://example.com/parent-story'],
		]);
		expect(document.body.textContent).not.toContain('View comment');
		expect(document.body.textContent).not.toContain('submissionAn external post');
		const discussionLinks = Array.from(
			document.querySelectorAll<HTMLAnchorElement>('.oj-following__meta a')
		).map((link) => [link.textContent, link.href]);
		expect(discussionLinks).toContainEqual([
			'reply',
			'https://news.ycombinator.com/item?id=1002',
		]);
		expect(discussionLinks).toContainEqual([
			'comments',
			'https://news.ycombinator.com/item?id=2000',
		]);
		expect(discussionLinks).toContainEqual([
			'12 comments',
			'https://news.ycombinator.com/item?id=1001',
		]);
		expect(document.querySelector('.oj-follow-button')?.getAttribute('aria-label')).toBe(
			'Unfollow alice'
		);
	});

	it('defaults sections closed and reopens them from persisted expanded state', async () => {
		window.history.pushState({}, '', '/following');
		await setFollowedUsers(['alice']);

		document.body.innerHTML = `
			<center>
				<table id="hnmain">
					<tbody>
						<tr><td bgcolor="#ff6600"></td></tr>
						<tr>
							<td>
								<table><tbody><tr><td><span class="pagetop"><a id="me" href="user?id=viewer">viewer</a></span></td></tr></tbody></table>
							</td>
						</tr>
						<tr><td>missing page</td></tr>
						<tr>
							<td>
								<center><span class="yclinks"><a href="lists">Lists</a></span></center>
							</td>
						</tr>
					</tbody>
				</table>
			</center>
		`;

		vi.mocked(apiModule.getUserInfo).mockResolvedValue({
			about: '',
			created: 1,
			id: 'alice',
			karma: 420,
			submitted: [1001],
		});
		vi.mocked(apiModule.getItemInfo).mockResolvedValue({
			by: 'alice',
			descendants: 12,
			id: 1001,
			score: 99,
			time: 1_700_000_000,
			title: 'An external post',
			type: 'story',
			url: 'https://example.com/post',
		});

		await follow.main(mockContext);
		const rootBeforeToggle = document.getElementById('oj-following-root');

		const closedToggle = document.querySelector<HTMLButtonElement>(
			'button[aria-label="Expand alice activity"]'
		);
		const sectionContent = document.querySelector<HTMLElement>(
			'.oj-following__section > :nth-child(2)'
		);
		expect(closedToggle).toBeTruthy();
		expect(sectionContent?.hidden).toBe(true);

		closedToggle?.click();

		await waitFor(() => {
			expect(sectionContent?.hidden).toBe(false);
		});
		await waitFor(async () => {
			await expect(isFollowingSectionExpanded('alice')).resolves.toBe(true);
		});
		expect(document.getElementById('oj-following-root')).toBe(rootBeforeToggle);

		const openToggle = document.querySelector<HTMLButtonElement>(
			'button[aria-label="Collapse alice activity"]'
		);
		expect(openToggle).toBeTruthy();
		expect(document.body.textContent).toContain('An external post');

		await follow.main(mockContext);
		expect(document.body.textContent).toContain('An external post');
	});

	it('shows a loading indicator while followed activity is loading', async () => {
		window.history.pushState({}, '', '/following');
		await setFollowedUsers(['alice']);

		document.body.innerHTML = `
			<center>
				<table id="hnmain">
					<tbody>
						<tr><td bgcolor="#ff6600"></td></tr>
						<tr>
							<td>
								<table><tbody><tr><td><span class="pagetop"><a id="me" href="user?id=viewer">viewer</a></span></td></tr></tbody></table>
							</td>
						</tr>
						<tr><td>missing page</td></tr>
						<tr><td><center><span class="yclinks"><a href="lists">Lists</a></span></center></td></tr>
					</tbody>
				</table>
			</center>
		`;

		let resolveUserInfo: ((value: HNUser) => void) | undefined;
		const userInfoPromise = new Promise<HNUser>((resolve) => {
			resolveUserInfo = resolve;
		});
		vi.mocked(apiModule.getUserInfo).mockReturnValue(userInfoPromise);

		const renderPromise = follow.main(mockContext);

		await waitFor(() => {
			expect(document.querySelector('.oj-following__loading')).toBeTruthy();
			expect(document.body.textContent).toContain('Loading activity...');
		});

		resolveUserInfo?.({
			about: '',
			created: 1,
			id: 'alice',
			karma: 420,
			submitted: [],
		});

		await renderPromise;

		await waitFor(() => {
			expect(document.querySelector('.oj-following__loading')).toBeNull();
		});
	});

	it('keeps followed comments and submissions in one reverse-chronological feed', async () => {
		window.history.pushState({}, '', '/following');
		await setFollowedUsers(['alice']);
		await setFollowingSectionExpanded('alice', true);

		document.body.innerHTML = `
			<center>
				<table id="hnmain">
					<tbody>
						<tr><td bgcolor="#ff6600"></td></tr>
						<tr>
							<td>
								<table><tbody><tr><td><span class="pagetop"><a id="me" href="user?id=viewer">viewer</a></span></td></tr></tbody></table>
							</td>
						</tr>
						<tr><td>missing page</td></tr>
						<tr><td><center><span class="yclinks"><a href="lists">Lists</a></span></center></td></tr>
					</tbody>
				</table>
			</center>
		`;

		vi.mocked(apiModule.getUserInfo).mockResolvedValue({
			about: '',
			created: 1,
			id: 'alice',
			karma: 420,
			submitted: [1001, 1002, 1003],
		});
		vi.mocked(apiModule.getItemInfo)
			.mockResolvedValueOnce({
				by: 'alice',
				id: 1001,
				score: 1,
				time: 1_700_000_000,
				title: 'Older story',
				type: 'story',
				url: 'https://example.com/older-story',
			})
			.mockResolvedValueOnce({
				by: 'alice',
				id: 1002,
				parent: 1001,
				text: '<p>Newest comment</p>',
				time: 1_700_000_200,
				type: 'comment',
			})
			.mockResolvedValueOnce({
				by: 'alice',
				id: 1003,
				score: 2,
				time: 1_700_000_100,
				title: 'Middle story',
				type: 'story',
				url: 'https://example.com/middle-story',
			});
		await follow.main(mockContext);

		const sectionText =
			document.querySelector<HTMLElement>('.oj-following__section')?.textContent ?? '';
		const newestCommentIndex = sectionText.indexOf('Newest comment');
		const middleStoryIndex = sectionText.indexOf('Middle story');
		const olderStoryIndex = sectionText.lastIndexOf('Older story');

		expect(newestCommentIndex).toBeGreaterThanOrEqual(0);
		expect(middleStoryIndex).toBeGreaterThanOrEqual(0);
		expect(olderStoryIndex).toBeGreaterThanOrEqual(0);
		expect(newestCommentIndex).toBeLessThan(middleStoryIndex);
		expect(middleStoryIndex).toBeLessThan(olderStoryIndex);
	});

	it('reuses cached following sections before fetching fresh data', async () => {
		window.history.pushState({}, '', '/following');
		await setFollowedUsers(['alice']);
		await setFollowingSectionExpanded('alice', true);
		await setCachedFollowingSection({
			items: [
				{
					by: 'alice',
					id: 1001,
					time: 1_700_000_000,
					title: 'Cached story',
					type: 'story',
					url: 'https://example.com/cached-story',
				},
			],
			user: {
				about: '',
				created: 1,
				id: 'alice',
				karma: 420,
				submitted: [1001],
			},
			username: 'alice',
		});

		document.body.innerHTML = `
			<center>
				<table id="hnmain">
					<tbody>
						<tr><td bgcolor="#ff6600"></td></tr>
						<tr>
							<td>
								<table><tbody><tr><td><span class="pagetop"><a id="me" href="user?id=viewer">viewer</a></span></td></tr></tbody></table>
							</td>
						</tr>
						<tr><td>missing page</td></tr>
						<tr><td><center><span class="yclinks"><a href="lists">Lists</a></span></center></td></tr>
					</tbody>
				</table>
			</center>
		`;

		await follow.main(mockContext);

		expect(document.body.textContent).toContain('Cached story');
		expect(apiModule.getUserInfo).not.toHaveBeenCalled();
		expect(apiModule.getItemInfo).not.toHaveBeenCalled();
	});

	it('refreshes a single user section after clearing that user cache', async () => {
		window.history.pushState({}, '', '/following');
		await setFollowedUsers(['alice']);
		await setFollowingSectionExpanded('alice', true);
		await setCachedFollowingSection({
			items: [
				{
					by: 'alice',
					id: 1001,
					time: 1_700_000_000,
					title: 'Cached story',
					type: 'story',
					url: 'https://example.com/cached-story',
				},
			],
			user: {
				about: '',
				created: 1,
				id: 'alice',
				karma: 420,
				submitted: [1001],
			},
			username: 'alice',
		});

		document.body.innerHTML = `
			<center>
				<table id="hnmain">
					<tbody>
						<tr><td bgcolor="#ff6600"></td></tr>
						<tr>
							<td>
								<table><tbody><tr><td><span class="pagetop"><a id="me" href="user?id=viewer">viewer</a></span></td></tr></tbody></table>
							</td>
						</tr>
						<tr><td>missing page</td></tr>
						<tr><td><center><span class="yclinks"><a href="lists">Lists</a></span></center></td></tr>
					</tbody>
				</table>
			</center>
		`;

		await follow.main(mockContext);
		expect(document.body.textContent).toContain('Cached story');

		vi.mocked(apiModule.getUserInfo).mockResolvedValue({
			about: '',
			created: 1,
			id: 'alice',
			karma: 421,
			submitted: [1002],
		});
		vi.mocked(apiModule.getItemInfo).mockResolvedValue({
			by: 'alice',
			id: 1002,
			score: 10,
			time: 1_700_000_100,
			title: 'Fresh story',
			type: 'story',
			url: 'https://example.com/fresh-story',
		});

		const refreshButton = document.querySelector<HTMLButtonElement>(
			'button[aria-label="Refresh alice"]'
		);
		expect(refreshButton).toBeTruthy();

		refreshButton?.click();

		await waitFor(() => {
			expect(document.body.textContent).toContain('Fresh story');
		});
		expect(document.body.textContent).not.toContain('Cached story');
	});

	it('reorders followed users when a summary username is dragged to a new horizontal position', async () => {
		window.history.pushState({}, '', '/following');
		await setFollowedUsers(['alice', 'bob']);

		document.body.innerHTML = `
			<center>
				<table id="hnmain">
					<tbody>
						<tr><td bgcolor="#ff6600"></td></tr>
						<tr>
							<td>
								<table><tbody><tr><td><span class="pagetop"><a id="me" href="user?id=viewer">viewer</a></span></td></tr></tbody></table>
							</td>
						</tr>
						<tr><td>missing page</td></tr>
						<tr><td><center><span class="yclinks"><a href="lists">Lists</a></span></center></td></tr>
					</tbody>
				</table>
			</center>
		`;

		vi.mocked(apiModule.getUserInfo).mockImplementation(async (username) => ({
			about: '',
			created: 1,
			id: username,
			karma: username === 'alice' ? 100 : 200,
			submitted: [],
		}));

		await follow.main(mockContext);

		const summary = document.querySelector<HTMLDivElement>('.oj-following__summary');
		const summaryItems = Array.from(
			document.querySelectorAll<HTMLElement>('.oj-following__summary-item')
		);
		const aliceItem = summaryItems.find((item) => item.textContent === 'alice');
		const bobItem = summaryItems.find((item) => item.textContent === 'bob');
		const aliceLink = aliceItem?.querySelector<HTMLAnchorElement>('a');
		const bobLink = bobItem?.querySelector<HTMLAnchorElement>('a');
		expect(summary).toBeTruthy();
		expect(aliceItem).toBeTruthy();
		expect(bobItem).toBeTruthy();
		expect(aliceLink).toBeTruthy();
		expect(bobLink).toBeTruthy();

		if (aliceItem) {
			aliceItem.getBoundingClientRect = () =>
				({
					bottom: 10,
					height: 10,
					left: 40,
					right: 80,
					top: 0,
					width: 40,
					x: 40,
					y: 0,
					toJSON: () => '',
				}) as DOMRect;
		}
		if (bobItem) {
			bobItem.getBoundingClientRect = () =>
				({
					bottom: 10,
					height: 10,
					left: 90,
					right: 120,
					top: 0,
					width: 30,
					x: 90,
					y: 0,
					toJSON: () => '',
				}) as DOMRect;
		}

		const dragStartEvent = new MouseEvent('mousedown', {
			bubbles: true,
			cancelable: true,
			button: 0,
			clientX: 100,
		});
		bobLink?.dispatchEvent(dragStartEvent);

		const dragOverEvent = new MouseEvent('mousemove', {
			bubbles: true,
			cancelable: true,
			clientX: 20,
		});
		document.dispatchEvent(dragOverEvent);
		expect(document.querySelector('.oj-following__summary-insertion')).toBeTruthy();

		const dropEvent = new MouseEvent('mouseup', {
			bubbles: true,
			cancelable: true,
			clientX: 20,
		});
		document.dispatchEvent(dropEvent);

		await waitFor(async () => {
			expect(
				Array.from(document.querySelectorAll<HTMLElement>('.oj-following__section')).map(
					(section) =>
						section.querySelector<HTMLElement>('.oj-following__user-name a')
							?.textContent
				)
			).toEqual(['bob', 'alice']);
			await expect(getFollowedUsers()).resolves.toEqual(['bob', 'alice']);
		});
	});
});
