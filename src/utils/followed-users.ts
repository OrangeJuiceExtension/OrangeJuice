import lStorage from '@/utils/local-storage.ts';

export const FOLLOWED_USERS_STORAGE_KEY = 'oj_followed_users';

const normalizeUsername = (username: string): string => username.trim();

const sanitizeFollowedUsers = (usernames: readonly string[]): string[] => {
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

export const getFollowedUsers = async (): Promise<string[]> => {
	const stored = await lStorage.getItem<string[]>(FOLLOWED_USERS_STORAGE_KEY);
	if (!Array.isArray(stored)) {
		return [];
	}

	return sanitizeFollowedUsers(stored);
};

export const setFollowedUsers = async (usernames: readonly string[]): Promise<string[]> => {
	const nextUsernames = sanitizeFollowedUsers(usernames);
	await lStorage.setItem(FOLLOWED_USERS_STORAGE_KEY, nextUsernames);
	return nextUsernames;
};

export const reorderFollowedUsers = async (
	username: string,
	targetUsername: string
): Promise<string[]> => {
	const normalizedUsername = normalizeUsername(username);
	const normalizedTargetUsername = normalizeUsername(targetUsername);
	if (!(normalizedUsername && normalizedTargetUsername)) {
		throw new Error('Usernames are required.');
	}

	if (normalizedUsername === normalizedTargetUsername) {
		return getFollowedUsers();
	}

	const followedUsers = await getFollowedUsers();
	const fromIndex = followedUsers.indexOf(normalizedUsername);
	const targetIndex = followedUsers.indexOf(normalizedTargetUsername);
	if (fromIndex === -1 || targetIndex === -1) {
		return followedUsers;
	}

	const nextUsernames = [...followedUsers];
	const [movedUsername] = nextUsernames.splice(fromIndex, 1);
	nextUsernames.splice(targetIndex, 0, movedUsername);

	return setFollowedUsers(nextUsernames);
};

export const isFollowingUser = async (username: string): Promise<boolean> => {
	const normalized = normalizeUsername(username);
	if (!normalized) {
		return false;
	}

	const followedUsers = await getFollowedUsers();
	return followedUsers.includes(normalized);
};

export const toggleFollowedUser = async (username: string): Promise<boolean> => {
	const normalized = normalizeUsername(username);
	if (!normalized) {
		throw new Error('Username is required.');
	}

	const followedUsers = await getFollowedUsers();
	const isFollowing = followedUsers.includes(normalized);
	const nextUsernames = isFollowing
		? followedUsers.filter((entry) => entry !== normalized)
		: [...followedUsers, normalized];

	await setFollowedUsers(nextUsernames);
	return !isFollowing;
};
