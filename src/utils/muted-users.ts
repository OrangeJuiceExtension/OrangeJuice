import lStorage from '@/utils/local-storage.ts';

export const MUTED_USERS_STORAGE_KEY = 'oj_muted_users';

const normalizeUsername = (username: string): string => username.trim();

const sanitizeMutedUsers = (usernames: readonly string[]): string[] => {
	const deduped = new Set<string>();

	for (const username of usernames) {
		const normalized = normalizeUsername(username);
		if (!normalized) {
			continue;
		}
		deduped.add(normalized);
	}

	return Array.from(deduped);
};

export const getMutedUsers = async (): Promise<string[]> => {
	const stored = await lStorage.getItem<string[]>(MUTED_USERS_STORAGE_KEY);
	if (!Array.isArray(stored)) {
		return [];
	}

	return sanitizeMutedUsers(stored);
};

export const setMutedUsers = async (usernames: readonly string[]): Promise<string[]> => {
	const nextUsernames = sanitizeMutedUsers(usernames);
	await lStorage.setItem(MUTED_USERS_STORAGE_KEY, nextUsernames);
	return nextUsernames;
};

export const isMutedUser = async (username: string): Promise<boolean> => {
	const normalized = normalizeUsername(username);
	if (!normalized) {
		return false;
	}

	const mutedUsers = await getMutedUsers();
	return mutedUsers.includes(normalized);
};

export const toggleMutedUser = async (username: string): Promise<boolean> => {
	const normalized = normalizeUsername(username);
	if (!normalized) {
		throw new Error('Username is required.');
	}

	const mutedUsers = await getMutedUsers();
	const isMuted = mutedUsers.includes(normalized);
	const nextUsernames = isMuted
		? mutedUsers.filter((entry) => entry !== normalized)
		: [...mutedUsers, normalized];

	await setMutedUsers(nextUsernames);
	return !isMuted;
};
