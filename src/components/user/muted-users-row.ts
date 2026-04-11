import type { ContentScriptContext } from '#imports';
import { ACTION_BUTTON_CLASS, getActionButtonStyle } from '@/utils/action-button.ts';
import lStorage from '@/utils/local-storage.ts';
import {
	getMutedUsers,
	isMutedUser,
	MUTED_USERS_STORAGE_KEY,
	setMutedUsers,
	toggleMutedUser,
} from '@/utils/muted-users.ts';

const MUTED_USERS_ROW_CLASS = 'oj-muted-users-row';
const MUTED_USERS_LIST_CLASS = 'oj-muted-users-list';
const MUTED_USERS_ITEM_CLASS = 'oj-muted-users-item';
const MUTED_USERS_STYLE_ID = 'oj-muted-users-row-style';
const MUTED_USERS_ACTION_ROW_CLASS = 'oj-muted-users-action-row';

const ensureMutedUsersRowStyles = (doc: Document): void => {
	if (doc.getElementById(MUTED_USERS_STYLE_ID)) {
		return;
	}

	const style = doc.createElement('style');
	style.id = MUTED_USERS_STYLE_ID;
	style.textContent = `
		.${MUTED_USERS_LIST_CLASS} {
			display: inline-grid;
			row-gap: 6px;
		}

		.${MUTED_USERS_ITEM_CLASS} {
			display: grid;
			grid-template-columns: 15ch auto;
			align-items: center;
			column-gap: 8px;
			width: max-content;
		}
	${getActionButtonStyle()}
	`;
	doc.head.appendChild(style);
};

const findProfileTableBody = (doc: Document): HTMLTableSectionElement | null => {
	for (const row of doc.querySelectorAll<HTMLTableRowElement>('tr')) {
		const labelCell = row.querySelector<HTMLTableCellElement>('td:first-child');
		if (labelCell?.textContent?.trim() !== 'user:') {
			continue;
		}

		return row.closest<HTMLTableSectionElement>('tbody') ?? null;
	}

	return null;
};

const removeExistingRow = (tableBody: HTMLTableSectionElement): void => {
	tableBody.querySelector(`.${MUTED_USERS_ROW_CLASS}`)?.remove();
	tableBody.querySelector(`.${MUTED_USERS_ACTION_ROW_CLASS}`)?.remove();
};

const getCurrentUsername = (doc: Document): string | undefined => {
	return (
		doc
			.querySelector<HTMLAnchorElement>('span.pagetop a[href*="user?id="]')
			?.textContent?.split(' ')[0] || undefined
	);
};

const getProfileUsername = (tableBody: HTMLTableSectionElement): string | undefined => {
	for (const row of tableBody.querySelectorAll<HTMLTableRowElement>('tr')) {
		const labelCell = row.querySelector<HTMLTableCellElement>('td:first-child');
		if (labelCell?.textContent?.trim() !== 'user:') {
			continue;
		}

		const username = row
			.querySelector<HTMLAnchorElement>('td:last-child a.hnuser')
			?.textContent?.trim();
		if (username) {
			return username;
		}
	}
};

const createMutedUsersContent = (
	doc: Document,
	usernames: readonly string[],
	onUnmute: (username: string) => Promise<void>
): Node => {
	if (!usernames.length) {
		return doc.createTextNode('none');
	}

	const fragment = doc.createDocumentFragment();
	const list = doc.createElement('span');
	list.className = MUTED_USERS_LIST_CLASS;

	for (const username of usernames) {
		const item = doc.createElement('span');
		item.className = MUTED_USERS_ITEM_CLASS;

		const link = doc.createElement('a');
		link.href = `user?id=${encodeURIComponent(username)}`;
		link.textContent = username;

		const button = doc.createElement('button');
		button.type = 'button';
		button.className = ACTION_BUTTON_CLASS;
		button.textContent = 'unmute';
		button.addEventListener('click', async () => {
			await onUnmute(username);
		});

		item.append(link, doc.createTextNode(' '), button);
		list.append(item);
	}

	fragment.append(list);
	return fragment;
};

export const mutedUsersRow = async (ctx: ContentScriptContext, doc: Document): Promise<void> => {
	if (!window.location.pathname.startsWith('/user')) {
		return;
	}

	ensureMutedUsersRowStyles(doc);

	const tableBody = findProfileTableBody(doc);
	if (!tableBody) {
		return;
	}

	const currentUsername = getCurrentUsername(doc);
	const profileUsername = getProfileUsername(tableBody);
	if (!profileUsername) {
		return;
	}

	const render = async (): Promise<void> => {
		removeExistingRow(tableBody);

		if (currentUsername && currentUsername === profileUsername) {
			const mutedUsers = await getMutedUsers();
			const row = doc.createElement('tr');
			row.className = MUTED_USERS_ROW_CLASS;
			row.style.paddingTop = '10px';

			const labelCell = doc.createElement('td');
			labelCell.textContent = 'muted:';
			labelCell.setAttribute('valign', 'top');
			labelCell.style.paddingTop = '10px';

			const valueCell = doc.createElement('td');
			valueCell.style.paddingTop = '10px';
			valueCell.append(
				createMutedUsersContent(doc, mutedUsers, async (username: string) => {
					const nextMutedUsers = mutedUsers.filter((entry) => entry !== username);
					await setMutedUsers(nextMutedUsers);
					await render();
				})
			);

			row.append(labelCell, valueCell);
			tableBody.append(row);
			return;
		}

		const row = doc.createElement('tr');
		row.className = MUTED_USERS_ACTION_ROW_CLASS;

		const labelCell = doc.createElement('td');
		labelCell.textContent = 'mute:';
		labelCell.setAttribute('valign', 'top');
		labelCell.style.paddingTop = '10px';

		const valueCell = doc.createElement('td');
		valueCell.style.paddingTop = '10px';

		const button = doc.createElement('button');
		button.type = 'button';
		button.className = ACTION_BUTTON_CLASS;
		button.textContent = (await isMutedUser(profileUsername)) ? 'unmute' : 'mute';
		button.addEventListener('click', async () => {
			const muted = await toggleMutedUser(profileUsername);
			button.textContent = muted ? 'unmute' : 'mute';
		});

		valueCell.append(button);
		row.append(labelCell, valueCell);
		tableBody.append(row);
	};

	await render();

	const unwatch = lStorage.watch(MUTED_USERS_STORAGE_KEY, async () => {
		await render();
	});
	ctx.onInvalidated(unwatch);
};
