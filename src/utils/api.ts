// Source for the extension is here: https://github.com/OrangeJuiceExtension/orange-juice-worker
// This could go private in the future, but we will see how things go.

import { createClientServices } from '@/services/manager.ts';

export const WORKER_BASE = 'https://squeeze.oj-hn.com';

function fetchJson<T>(url: string): Promise<T | null | undefined> {
	const service = createClientServices().getFetchRemoteService();
	return service.fetchJson(`${WORKER_BASE}/yxorp/v0/${url}`);
}

export function getUserInfo(username: string, h?: string) {
	const h2 = h ? `?h=${encodeURIComponent(h)}` : '';
	return fetchJson<HNUser>(`user/${encodeURIComponent(username)}.json${h2}`);
}

export function getItemInfo(itemId: string) {
	return fetchJson<HNItemInfo>(`item/${encodeURIComponent(itemId)}.json`);
}

export const apiModule = {
	getUserInfo,
	getItemInfo,
};

// Field	Description
// id	The user's unique username. Case-sensitive. Required.
// created	Creation date of the user, in Unix Time.
// 	karma	The user's karma.
// about	The user's optional self-description. HTML.
// submitted	List of the user's stories, polls and comments.
export interface HNUser {
	id: string;
	created: number;
	karma: number;
	about?: string;
	submitted: number[];
}

// Field	Description
// id	The item's unique id.
// deleted	true if the item is deleted.
// 	type	The type of item. One of "job", "story", "comment", "poll", or "pollopt".
// 	by	The username of the item's author.
// time	Creation date of the item, in Unix Time.
// 	text	The comment, story or poll text. HTML.
// 	dead	true if the item is dead.
// 	parent	The comment's parent: either another comment or the relevant story.
// poll	The pollopt's associated poll.
// kids	The ids of the item's comments, in ranked display order.
// url	The URL of the story.
// 	score	The story's score, or the votes for a pollopt.
// title	The title of the story, poll or job. HTML.
// 	parts	A list of related pollopts, in display order.
// 	descendants	In the case of stories or polls, the total comment count.
export interface HNItemInfo {
	id: number;
	deleted?: boolean;
	type: 'job' | 'story' | 'comment' | 'poll' | 'pollopt';
	by?: string;
	time: number;
	text?: string;
	dead?: boolean;
	parent?: number;
	poll?: number;
	kids?: number[];
	url?: string;
	score?: number;
	title?: string;
	parts?: number[];
	descendants?: number;
}
