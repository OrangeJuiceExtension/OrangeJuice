import { waitFor } from '@testing-library/dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { follow } from '@/components/follow/index.ts';
import { apiModule } from '@/utils/api.ts';
import { setFollowedUsers } from '@/utils/followed-users.ts';
import { setCachedFollowingSection } from '@/utils/following-cache.ts';
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
		expect(document.body.textContent).not.toContain('View comment');
		expect(document.body.textContent).not.toContain('submissionAn external post');
		const discussionLinks = Array.from(
			document.querySelectorAll<HTMLAnchorElement>('.oj-following__meta a')
		).map((link) => link.textContent);
		expect(discussionLinks).toContain('12 comments');
		expect(document.querySelector('.oj-follow-button')?.getAttribute('aria-label')).toBe(
			'Unfollow alice'
		);
	});

	it('keeps followed comments and submissions in one reverse-chronological feed', async () => {
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
});
