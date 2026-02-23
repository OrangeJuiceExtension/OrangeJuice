import { withBackoff } from '@/utils/backoff.ts';
import { DAYS_1, DAYS_30 } from '@/utils/constants.ts';
import { dom } from '@/utils/dom.ts';
import lStorage from '@/utils/local-storage.ts';
import { paths } from '@/utils/paths.ts';

const STORAGE_KEY = 'oj_activity_trail';
const idMatchPattern = /id=(\d+)/;
const authMatchPattern = /auth=([^&]+)/;

export const ActivityId = {
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

export type ActivityType = (typeof ActivityId)[keyof typeof ActivityId];

export const ActivityTypes: ActivityType[] = [
	ActivityId.Comments,
	ActivityId.Submissions,
	ActivityId.Hidden,
	ActivityId.FlagsSubmissions,
	ActivityId.FlagsComments,
	ActivityId.VotesSubmissions,
	ActivityId.VotesComments,
	ActivityId.FavoriteSubmissions,
	ActivityId.FavoriteComments,
];

type HNItemId = string;

export interface ActivityDetail {
	auth?: string;
	exp: number;
	id: HNItemId;
	type: ActivityType;
}

type StoredActivityDetail = Omit<ActivityDetail, 'type'>;
type StoredActivityTypeModel = Partial<Record<ActivityType, StoredActivityDetail[]>>;
type ActivityTypeRecord = Partial<Record<ActivityType, Record<HNItemId, ActivityDetail>>>;

interface StoredData {
	items: StoredActivityTypeModel;
	lastSync: number;
}

type Simplify<T> = { [K in keyof T]: T[K] } & {};
type WithOptionalExceptId<T extends { id: PropertyKey }> = Simplify<
	Pick<T, 'id'> & Partial<Omit<T, 'id'>>
>;

type ActivityListener = (detail: ActivityDetail) => Promise<void>;

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
			return undefined;
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
			return undefined;
	}
};

export class ActivityTrail {
	private storedData?: StoredData;
	private indexedData?: ActivityTypeRecord;
	private readonly listeners: Set<ActivityListener> = new Set();

	addListener(listener: ActivityListener): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	removeListener(listener: ActivityListener): void {
		this.listeners.delete(listener);
	}

	private async notifyListeners(detail: ActivityDetail): Promise<void> {
		await Promise.all(Array.from(this.listeners).map((listener) => listener(detail)));
	}

	// if we know id AND type, the lookup is a lot faster
	async get(detail: WithOptionalExceptId<ActivityDetail>): Promise<ActivityDetail | undefined> {
		if (detail.type !== undefined) {
			const indexed = await this.getIndexed();
			return indexed[detail.type]?.[detail.id];
		}

		const stored = await this.getStored();
		for (const [typeStr, list] of Object.entries(stored.items)) {
			const type = Number(typeStr) as ActivityType;
			const found = list?.find((d) => d.id === detail.id);
			if (found) {
				return { ...found, type };
			}
		}
		return undefined;
	}

	async set(detail: ActivityDetail): Promise<void> {
		const indexed = await this.getIndexed();

		// biome-ignore lint/suspicious/noAssignInExpressions: it is ok
		(indexed[detail.type] ??= {})[detail.id] = detail;

		await this.save(await this.toStored());
		await this.notifyListeners(detail);
	}

	async addActivities(activities: ActivityDetail[]): Promise<void> {
		const stored = await this.getStored();

		for (const activity of activities) {
			const { id, auth, exp } = activity;
			// biome-ignore lint/suspicious/noAssignInExpressions: it is ok
			(stored.items[activity.type] ??= []).push({ id, auth, exp });
		}

		await this.save(stored);
		this.indexedData = undefined; // invalidate index
	}

	async remove(detail: ActivityDetail): Promise<boolean> {
		const indexed = await this.getIndexed();
		const bucket = indexed[detail.type];

		if (!(bucket && detail.id in bucket)) {
			return false;
		}

		delete bucket[detail.id];

		await this.save(await this.toStored());
		await this.notifyListeners(detail);
		return true;
	}

	private async toRecord(): Promise<ActivityTypeRecord> {
		const stored = await this.getStored();
		const out: ActivityTypeRecord = {};

		for (const [typeStr, list] of Object.entries(stored.items)) {
			const type = Number(typeStr) as ActivityType;
			const byId: Record<HNItemId, ActivityDetail> = {};

			for (const storedDetail of list ?? []) {
				const detail: ActivityDetail = { ...storedDetail, type };
				byId[detail.id] = detail;
			}

			out[type] = byId;
		}

		return out;
	}

	async toStored(): Promise<StoredData> {
		const indexed = await this.getIndexed();
		const items: StoredActivityTypeModel = {};

		for (const [typeStr, byId] of Object.entries(indexed)) {
			const type = Number(typeStr) as ActivityType;
			const details = Object.values(byId ?? {});
			items[type] = details.map(({ id, auth, exp }) => ({ id, auth, exp }));
		}

		return {
			lastSync: this.storedData?.lastSync ?? 0,
			items,
		};
	}

	async isExpired(): Promise<boolean> {
		this.storedData = await this.load();

		const lastSync = this.storedData.lastSync;
		if (lastSync === 0) {
			return true;
		}

		return Date.now() - lastSync > DAYS_1;
	}

	private async getStored(): Promise<StoredData> {
		if (!this.storedData) {
			this.storedData = await this.load();
		}
		return this.storedData;
	}

	private async getIndexed(): Promise<ActivityTypeRecord> {
		if (!this.indexedData) {
			this.indexedData = await this.toRecord();
		}
		return this.indexedData;
	}

	private async load(): Promise<StoredData> {
		const stored = await lStorage.getItem<StoredData>(STORAGE_KEY);
		return stored ?? { items: {}, lastSync: 0 };
	}

	private async save(data: StoredData): Promise<void> {
		const next: StoredData = { ...data, lastSync: Date.now() };
		this.storedData = next;
		await lStorage.setItem<StoredData>(STORAGE_KEY, next);
	}
}
class ActivityFetcher {
	private readonly username: string;
	private readonly activityTrail: ActivityTrail;

	constructor(username: string, activityTrail: ActivityTrail) {
		this.username = username;
		this.activityTrail = activityTrail;
	}

	async start() {
		const isExpired = await this.activityTrail.isExpired();
		if (isExpired) {
			for (const activityType of ActivityTypes) {
				const activities = await this.fetchAllByType(activityType);
				await this.activityTrail.addActivities(activities);
			}
		}
	}

	async fetchAllByType(type: ActivityType, cache: RequestCache | undefined = 'force-cache') {
		type PageFn = (page: number) => Promise<void>;

		async function runPagesSequentially(pages: number[], work: PageFn): Promise<void> {
			for (const page of pages) {
				await withBackoff(() => work(page));
			}
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
				return;
			}

			for (const item of this.extractItemsFromPage(doc, type)) {
				items.push({
					...item,
				});
			}

			if (this.hasMore(doc)) {
				pagesToProcess.push(page + 1);
			}
		};

		while (pagesToProcess.length > 0) {
			const currentBatch = pagesToProcess.splice(0, pagesToProcess.length);

			await runPagesSequentially(currentBatch, async (page: number) => {
				await processPage(page);
			});
		}

		return items;
	}

	hasMore(doc: HTMLElement): boolean {
		return !!doc.querySelector<HTMLAnchorElement>('a.morelink[href*="p="]');
	}

	extractItemsFromPage(doc: HTMLElement, type: ActivityType): ActivityDetail[] {
		const actionLink = actionFromType(type);
		if (actionLink) {
			return this.extractItemsWithAuth(doc, actionLink, type);
		}
		return this.extractItemsWithoutAuth(doc, type);
	}

	extractItemsWithAuth = (
		doc: HTMLElement,
		actionLink: string,
		type: ActivityType
	): ActivityDetail[] => {
		const items: ActivityDetail[] = [];
		const links = doc.querySelectorAll<HTMLAnchorElement>(`a[href*="${actionLink}"]`);

		for (const link of links) {
			const href = link.getAttribute('href') || '';
			const idMatch = href.match(idMatchPattern);
			const authMatch = href.match(authMatchPattern);

			if (idMatch && authMatch) {
				items.push({
					id: idMatch[1],
					exp: Date.now() + DAYS_30,
					type,
					auth: authMatch[1],
				});
			}
		}

		return items;
	};

	extractItemsWithoutAuth(doc: HTMLElement, type: ActivityType) {
		const items: ActivityDetail[] = [];
		const links = doc.querySelectorAll<HTMLAnchorElement>('.age');

		for (const link of links) {
			const href = link.getAttribute('href') || '';
			const idMatch = href.match(idMatchPattern);

			if (idMatch) {
				items.push({
					id: idMatch[1],
					exp: Date.now() + DAYS_30,
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

let cachedActivityTrail: ActivityTrail | undefined;
export function newActivityTrail() {
	if (!cachedActivityTrail) {
		cachedActivityTrail = new ActivityTrail();
	}
	return cachedActivityTrail;
}
