import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import { getUserInfo } from '@/utils/api.ts';
import { topLeadersKarma } from './top-leaders-karma';

vi.mock('@/utils/api.ts', () => ({
	getUserInfo: vi.fn(),
}));

describe('topLeadersKarma', () => {
	let mockDoc: Document;
	let mockCtx: ContentScriptContext;

	beforeEach(() => {
		mockDoc = document.implementation.createHTMLDocument();
		mockCtx = {} as ContentScriptContext;
		window.location.pathname = '/leaders';
		vi.clearAllMocks();
	});

	it('should return early if no .athing elements found', async () => {
		mockDoc.body.innerHTML = '<div id="bigbox"></div>';
		let called = false;

		// biome-ignore lint/suspicious/useAwait: mocks
		vi.mocked(getUserInfo).mockImplementation(async (username) => {
			called = true;
			return {
				id: username || '',
				created: 1_609_459_200,
				karma: 100,
				submitted: [1, 2, 3],
			} as HNUser;
		});

		await topLeadersKarma(mockDoc, mockCtx);

		expect(called).toBeFalsy();
	});

	it('should fetch user info for up to 10 users in parallel', async () => {
		mockDoc.body.innerHTML = `
			<table id="bigbox">
				${Array.from({ length: 15 })
					.map(
						(_, i) => `
						<tr class="athing">
							<td class="subtext">
								<a href="user?id=user${i}" class="hnuser">user${i}</a>
								<span>foo</span>
							</td>
						</tr>`
					)
					.join('')}
			</table>
		`;

		const getUserInfoSpy = vi
			.mocked(getUserInfo)
			.mockImplementation(async (_username: string) => ({
				id: 'testuser',
				created: 1_234_567_890,
				karma: 1000,
				submitted: [],
			}));

		await topLeadersKarma(mockDoc, mockCtx);

		expect(getUserInfoSpy).toHaveBeenCalledTimes(10);
		for (let i = 0; i < 10; i++) {
			expect(getUserInfoSpy).toHaveBeenCalledWith(`user${i}`);
		}
	});

	it('should update DOM with karma values', async () => {
		mockDoc.body.innerHTML = `
			<table id="bigbox">
				<tr class="athing">
					<td class="subtext">
						<span>
							<a href="user?id=alice" class="hnuser">alice</a>
						</span>
						<span class="karma-placeholder">placeholder</span>
					</td>
				</tr>
				<tr class="athing">
					<td class="subtext">
						<span>
							<a href="user?id=bob" class="hnuser">bob</a>
						</span>
						<span class="karma-placeholder">placeholder</span>
					</td>
				</tr>
			</table>
		`;

		// biome-ignore lint/suspicious/useAwait: mocks
		vi.mocked(getUserInfo).mockImplementation(async (username: string) => {
			const karmaMap: Record<string, number> = { alice: 5000, bob: 3000 };
			return {
				id: username,
				created: 1_234_567_890,
				karma: karmaMap[username] || 0,
				submitted: [],
			} as HNUser;
		});

		await topLeadersKarma(mockDoc, mockCtx);

		const karmaSpans = mockDoc.querySelectorAll('.karma-placeholder');
		expect(karmaSpans[0]?.textContent).toBe('5000');
		expect(karmaSpans[1]?.textContent).toBe('3000');
	});

	it('should skip users with empty textContent', async () => {
		mockDoc.body.innerHTML = `
			<table id="bigbox">
				<tr class="athing">
					<td class="subtext">
						<span>
							<a href="user?id=" class="hnuser">   </a>
						</span>
						<span></span>
					</td>
				</tr>
				<tr class="athing">
					<td class="subtext">
						<span>
							<a href="user?id=validuser" class="hnuser">validuser</a>
						</span>
						<span></span>
					</td>
				</tr>
			</table>
		`;

		const getUserInfoSpy = vi.mocked(getUserInfo).mockResolvedValue({
			id: 'validuser',
			created: 1_234_567_890,
			karma: 2000,
			submitted: [],
		});

		await topLeadersKarma(mockDoc, mockCtx);

		expect(getUserInfoSpy).toHaveBeenCalledTimes(1);
		expect(getUserInfoSpy).toHaveBeenCalledWith('validuser');
	});

	it('should handle null userInfo gracefully', async () => {
		mockDoc.body.innerHTML = `
			<table id="bigbox">
				<tr class="athing">
					<td class="subtext">
						<span>
							<a href="user?id=alice" class="hnuser">alice</a>
						</span>
						<span class="karma-placeholder">original</span>
					</td>
				</tr>
			</table>
		`;

		vi.mocked(getUserInfo).mockResolvedValue(null);

		await topLeadersKarma(mockDoc, mockCtx);

		const karmaSpan = mockDoc.querySelector('.karma-placeholder');
		expect(karmaSpan?.textContent).toBe('original');
	});

	it('should not update DOM if anchor has no parent or no next sibling', async () => {
		mockDoc.body.innerHTML = `
			<table id="bigbox">
				<tr class="athing">
					<td class="subtext">
						<a href="user?id=alice" class="hnuser">alice</a>
					</td>
				</tr>
			</table>
		`;

		const getUserInfoSpy = vi.mocked(getUserInfo).mockResolvedValue({
			id: 'alice',
			created: 1_234_567_890,
			karma: 5000,
			submitted: [],
		});

		await topLeadersKarma(mockDoc, mockCtx);

		expect(getUserInfoSpy).toHaveBeenCalledWith('alice');
	});

	it('should process exactly 10 users even if more exist', async () => {
		mockDoc.body.innerHTML = `
			<table id="bigbox">
				${Array.from({ length: 20 })
					.map(
						(_, i) => `
					<tr class="athing">
						<td class="subtext">
							<span>
								<a href="user?id=user${i}" class="hnuser">user${i}</a>
							</span>
							<span></span>
						</td>
					</tr>
				`
					)
					.join('')}
			</table>
		`;

		const getUserInfoSpy = vi.mocked(getUserInfo).mockResolvedValue({
			id: 'testuser',
			created: 1_234_567_890,
			karma: 1000,
			submitted: [],
		});

		await topLeadersKarma(mockDoc, mockCtx);

		expect(getUserInfoSpy).toHaveBeenCalledTimes(10);
	});

	it('should call getUserInfo in parallel using Promise.all', async () => {
		mockDoc.body.innerHTML = `
			<table id="bigbox">
				${Array.from({ length: 5 })
					.map(
						(_, i) => `
					<tr class="athing">
						<td class="subtext">
							<span>
								<a href="user?id=user${i}" class="hnuser">user${i}</a>
							</span>
							<span></span>
						</td>
					</tr>
				`
					)
					.join('')}
			</table>
		`;

		const callOrder: string[] = [];
		vi.mocked(getUserInfo).mockImplementation(async (username: string) => {
			callOrder.push(`start-${username}`);
			await new Promise((resolve) => setTimeout(resolve, 10));
			callOrder.push(`end-${username}`);
			return {
				id: username,
				created: 1_234_567_890,
				karma: 1000,
				submitted: [],
			};
		});

		await topLeadersKarma(mockDoc, mockCtx);

		// All calls should start before any end
		const firstEndIndex = callOrder.findIndex((call) => call.startsWith('end-'));
		const allStartsBeforeFirstEnd = callOrder
			.slice(0, firstEndIndex)
			.every((call) => call.startsWith('start-'));
		expect(allStartsBeforeFirstEnd).toBe(true);
	});
});
