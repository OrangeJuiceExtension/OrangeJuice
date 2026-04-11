import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContentScriptContext } from '#imports';
import lStorage from '@/utils/local-storage.ts';
import { MUTED_USERS_STORAGE_KEY } from '@/utils/muted-users.ts';
import { mutedUsersRow } from './muted-users-row.ts';

const addListenerMock = vi.fn();
const removeListenerMock = vi.fn();

vi.mock('#imports', () => ({
	browser: {
		storage: {
			onChanged: {
				addListener: addListenerMock,
				removeListener: removeListenerMock,
			},
		},
	},
}));

describe('mutedUsersRow', () => {
	let mockCtx: ContentScriptContext;

	beforeEach(async () => {
		document.body.innerHTML = '';
		await lStorage.setItem(MUTED_USERS_STORAGE_KEY, null);
		vi.clearAllMocks();
		addListenerMock.mockClear();
		removeListenerMock.mockClear();
		mockCtx = {
			onInvalidated: vi.fn(),
		} as unknown as ContentScriptContext;
	});

	const renderProfileForm = (options?: {
		action?: string;
		currentUsername?: string;
		profileUsername?: string;
	}): void => {
		document.body.innerHTML = `
			<span class="pagetop">
				<a href="user?id=${options?.currentUsername ?? 'latchkey'}">${options?.currentUsername ?? 'latchkey'}</a>
			</span>
			<form action="${options?.action ?? 'xuser'}" method="post">
				<table>
					<tbody>
						<tr>
							<td>user:</td>
							<td><a href="user?id=${options?.profileUsername ?? 'latchkey'}" class="hnuser">${options?.profileUsername ?? 'latchkey'}</a></td>
						</tr>
						<tr>
							<td>about:</td>
							<td><textarea name="about"></textarea></td>
						</tr>
						<tr>
							<td></td>
							<td><input type="submit" value="update"></td>
						</tr>
					</tbody>
				</table>
			</form>
		`;
	};

	it('does nothing outside user pages', async () => {
		window.history.pushState({}, '', '/threads?id=latchkey');
		renderProfileForm();

		await mutedUsersRow(mockCtx, document);

		expect(document.querySelector('.oj-muted-users-row')).toBeNull();
	});

	it('appends a muted users row to the end of the profile table body', async () => {
		window.history.pushState({}, '', '/user?id=latchkey');
		renderProfileForm();
		await lStorage.setItem(MUTED_USERS_STORAGE_KEY, ['alice', 'bob']);

		await mutedUsersRow(mockCtx, document);

		const rows = Array.from(document.querySelectorAll('form[action="xuser"] tbody tr'));
		const mutedRow = rows.at(-1);
		if (!mutedRow) {
			throw new Error('Expected muted users row');
		}
		expect(mutedRow.classList.contains('oj-muted-users-row')).toBe(true);
		expect(mutedRow.textContent).toContain('muted:');
		expect(mutedRow.textContent).toContain('alice');
		expect(mutedRow.textContent).toContain('bob');
	});

	it('shows a mute action row when viewing another user profile', async () => {
		window.history.pushState({}, '', '/user?id=pg');
		renderProfileForm({ currentUsername: 'latchkey', profileUsername: 'pg' });

		await mutedUsersRow(mockCtx, document);

		const actionRow = document.querySelector('.oj-muted-users-action-row');
		expect(actionRow?.textContent).toContain('mute:');
		expect(actionRow?.textContent).toContain('mute');
		expect(document.querySelector('.oj-muted-users-row')).toBeNull();
	});

	it('toggles mute state from another user profile page', async () => {
		window.history.pushState({}, '', '/user?id=pg');
		renderProfileForm({ currentUsername: 'latchkey', profileUsername: 'pg' });

		await mutedUsersRow(mockCtx, document);

		const button = document.querySelector<HTMLButtonElement>('.oj-action-button');
		button?.click();

		await vi.waitFor(() => {
			expect(button?.textContent).toBe('unmute');
		});
		await expect(lStorage.getItem(MUTED_USERS_STORAGE_KEY)).resolves.toEqual(['pg']);
	});

	it('supports profile forms that use /xuser as the action', async () => {
		window.history.pushState({}, '', '/user?id=latchkey');
		renderProfileForm({ action: '/xuser' });
		await lStorage.setItem(MUTED_USERS_STORAGE_KEY, ['alice']);

		await mutedUsersRow(mockCtx, document);

		expect(document.querySelector('.oj-muted-users-row')?.textContent).toContain('alice');
	});

	it('shows none when no users are muted', async () => {
		window.history.pushState({}, '', '/user?id=latchkey');
		renderProfileForm();

		await mutedUsersRow(mockCtx, document);

		expect(document.querySelector('.oj-muted-users-row')?.textContent).toContain('none');
	});

	it('unmutes a user from the profile row', async () => {
		window.history.pushState({}, '', '/user?id=latchkey');
		renderProfileForm();
		await lStorage.setItem(MUTED_USERS_STORAGE_KEY, ['alice', 'bob']);

		await mutedUsersRow(mockCtx, document);

		const button = Array.from(
			document.querySelectorAll<HTMLButtonElement>('.oj-action-button')
		).find((item) => item.parentElement?.textContent?.includes('alice'));
		button?.click();

		await vi.waitFor(() => {
			expect(document.querySelector('.oj-muted-users-row')?.textContent).not.toContain(
				'alice'
			);
			expect(document.querySelector('.oj-muted-users-row')?.textContent).toContain('bob');
		});
		await expect(lStorage.getItem(MUTED_USERS_STORAGE_KEY)).resolves.toEqual(['bob']);
	});
});
