import {
	type ActivityDetail,
	ActivityId,
	type ActivityTrail,
	type ActivityType,
	newActivityTrail,
} from '@/utils/activity-trail.ts';
import { withBackoff } from '@/utils/backoff.ts';
import { DAYS_30 } from '@/utils/constants.ts';
import { dom } from '@/utils/dom.ts';
import { paths } from '@/utils/paths.ts';

const idMatchPattern = /id=(?<id>\d+)/u;
const authMatchPattern = /auth=(?<auth>[^&]+)/u;

// Only favorite and flag buttons consume synced activity state.
const SYNC_ACTIVITY_TYPES = [
	ActivityId.FlagsSubmissions,
	ActivityId.FlagsComments,
	ActivityId.FavoriteSubmissions,
	ActivityId.FavoriteComments,
] as const;

const actionFromType = (type: ActivityType): string | undefined => {
	switch (type) {
		case ActivityId.Hidden:
			return 'hide?id=';
		case ActivityId.FlagsSubmissions:
		case ActivityId.FlagsComments:
			return 'flag?id=';
		// case ActivityId.VotesComments:
		// 	return '/vote?id=';
		case ActivityId.FavoriteSubmissions:
		case ActivityId.FavoriteComments:
			return 'fave?id=';
		default:
			return;
	}
};

const urlFromType = (username: string, type: ActivityType, page = 1): string | undefined => {
	const pageParam = page > 1 ? `&p=${page}` : '';

	switch (type) {
		case ActivityId.Submissions:
			return `${paths.base}/submitted?id=${username}${pageParam}`;
		case ActivityId.Comments:
			return `${paths.base}/threads?id=${username}${pageParam}`;
		case ActivityId.Hidden:
			return `${paths.base}/hidden?id=${username}${pageParam}`;
		case ActivityId.FlagsSubmissions:
			return `${paths.base}/flagged?id=${username}${pageParam}`;
		case ActivityId.FlagsComments:
			return `${paths.base}/flagged?id=${username}&kind=comment${pageParam}`;
		case ActivityId.VotesSubmissions:
			return `${paths.base}/upvoted?id=${username}${pageParam}`;
		case ActivityId.VotesComments:
			return `${paths.base}/upvoted?id=${username}&comments=t${pageParam}`;
		case ActivityId.FavoriteSubmissions:
			return `${paths.base}/favorites?id=${username}${pageParam}`;
		case ActivityId.FavoriteComments:
			return `${paths.base}/favorites?id=${username}&comments=t${pageParam}`;
		default:
			return;
	}
};

export class ActivityFetcher {
	private syncPromise?: Promise<void>;
	private readonly username: string;
	private readonly activityTrail: ActivityTrail;

	constructor(username: string, activityTrail: ActivityTrail) {
		this.username = username;
		this.activityTrail = activityTrail;
	}

	start(): Promise<void> {
		this.syncPromise ??= this.sync();
		return this.syncPromise;
	}

	private async sync(): Promise<void> {
		try {
			if (!(await this.activityTrail.isExpired())) {
				return;
			}
			const activities: ActivityDetail[] = [];
			// Keep requests sequential to respect HN's rate limits.
			for (const type of SYNC_ACTIVITY_TYPES) {
				// biome-ignore lint/performance/noAwaitInLoops: remote pages must be fetched sequentially
				const items = await this.fetchAllByType(type);
				for (const item of items) {
					activities.push(item);
				}
			}
			await this.activityTrail.addActivities(activities);
		} finally {
			this.syncPromise = undefined;
		}
	}

	async fetchAllByType(type: ActivityType, cache: RequestCache | undefined = 'force-cache') {
		type PageFn = (page: number) => Promise<void>;

		async function runPagesSequentially(pages: number[], work: PageFn): Promise<void> {
			const runPage = async (index: number): Promise<void> => {
				const page = pages[index];
				if (page === undefined) {
					return;
				}
				await withBackoff(() => work(page), { retries: 3 });
				await runPage(index + 1);
			};
			await runPage(0);
		}

		const items: ActivityDetail[] = [];
		const pagesToProcess: number[] = [1];

		const processPage = async (page: number): Promise<void> => {
			const url = urlFromType(this.username, type, page);
			if (!url) {
				return;
			}

			const doc = await dom.getPageDom(url, cache);
			if (!doc) {
				throw new Error('Activity page could not be loaded');
			}

			for (const item of ActivityFetcher.extractItemsFromPage(doc, type)) {
				items.push({
					...item,
				});
			}

			if (ActivityFetcher.hasMore(doc)) {
				pagesToProcess.push(page + 1);
			}
		};

		const processQueuedPages = async (): Promise<void> => {
			if (pagesToProcess.length === 0) {
				return;
			}
			const currentBatch = pagesToProcess.splice(0, pagesToProcess.length);

			await runPagesSequentially(currentBatch, async (page: number) => {
				await processPage(page);
			});
			await processQueuedPages();
		};

		await processQueuedPages();

		return items;
	}

	private static hasMore(doc: HTMLElement): boolean {
		return !!doc.querySelector<HTMLAnchorElement>('a.morelink[href*="p="]');
	}

	private static extractItemsFromPage(doc: HTMLElement, type: ActivityType): ActivityDetail[] {
		const actionLink = actionFromType(type);
		if (actionLink) {
			return ActivityFetcher.extractItemsWithAuth(doc, actionLink, type);
		}
		return ActivityFetcher.extractItemsWithoutAuth(doc, type);
	}

	private static extractItemsWithAuth(
		doc: HTMLElement,
		actionLink: string,
		type: ActivityType
	): ActivityDetail[] {
		const items: ActivityDetail[] = [];
		const links = doc.querySelectorAll<HTMLAnchorElement>(`a[href*="${actionLink}"]`);

		for (const link of links) {
			const href = link.getAttribute('href') || '';
			const id = href.match(idMatchPattern)?.groups?.id;
			const auth = href.match(authMatchPattern)?.groups?.auth;

			if (id && auth) {
				items.push({
					auth,
					exp: Date.now() + DAYS_30,
					id,
					type,
				});
			}
		}

		return items;
	}

	private static extractItemsWithoutAuth(doc: HTMLElement, type: ActivityType) {
		const items: ActivityDetail[] = [];
		const links = doc.querySelectorAll<HTMLAnchorElement>('.age');

		for (const link of links) {
			const href = link.getAttribute('href') || '';
			const id = href.match(idMatchPattern)?.groups?.id;

			if (id) {
				items.push({
					exp: Date.now() + DAYS_30,
					id,
					type,
				});
			}
		}

		return items;
	}
}

let cachedActivityFetcher: ActivityFetcher | undefined;
export function newActivityFetcher(username: string) {
	if (!cachedActivityFetcher) {
		cachedActivityFetcher = new ActivityFetcher(username, newActivityTrail());
	}
	return cachedActivityFetcher;
}
