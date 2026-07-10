import type { ContentScriptDefinition } from 'wxt';

export type ComponentFeature = ContentScriptDefinition & {
	id: string;
	loginRequired: boolean;
	version?: string;
	username?: string;
};

export interface OJContext {
	user: User;
}

export const SavedItemType = {
	Comments: 0,
	FavoriteComments: 8,
	FavoriteSubmissions: 7,
	FlagsComments: 4,
	FlagsSubmissions: 3,
	Hidden: 2,
	Submissions: 1,
	VotesComments: 6,
	VotesSubmissions: 5,
};

export type SavedItemType = (typeof SavedItemType)[keyof typeof SavedItemType];

export const SavedItemTypes = [
	SavedItemType.Comments,
	SavedItemType.Submissions,
	SavedItemType.Hidden,
	SavedItemType.FlagsSubmissions,
	SavedItemType.FlagsComments,
	SavedItemType.VotesSubmissions,
	SavedItemType.VotesComments,
	SavedItemType.FavoriteSubmissions,
	SavedItemType.FavoriteComments,
];

export interface SavedItem {
	auth?: string;
	id: string;
	type: SavedItemType;
}

export interface User {
	username: string;
}
