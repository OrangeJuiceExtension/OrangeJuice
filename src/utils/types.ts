import type { ContentScriptDefinition } from 'wxt';
import type { Browser } from '#imports';

export type ComponentFeature = ContentScriptDefinition & {
	id: string;
	loginRequired: boolean;
	version?: string;
};

export interface OJContext {
	user: User;
}

export const SavedItemType = {
	Comments: 0,
	Submissions: 1,
	Hidden: 2,
	FlagsSubmissions: 3,
	FlagsComments: 4,
	VotesSubmissions: 5,
	VotesComments: 6,
	FavoriteSubmissions: 7,
	FavoriteComments: 8,
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
	id: string;
	auth?: string;
	type: SavedItemType;
}

export interface User {
	username: string;
}

export interface HNStory {
	position: number;
	id: string;
	title: string;
	url: string;
	points: number | null;
	author: string | null;
	postedDate: string | null;
	commentsCount: number | null;
	latestVisit?: Browser.history.VisitItem;
}
