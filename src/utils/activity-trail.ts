import { DAYS_1 } from '@/utils/constants.ts';
import lStorage from '@/utils/local-storage.ts';

const STORAGE_KEY = 'oj_activity_trail';

export const ActivityId = {
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
			const found = list?.find((d) => d.id === detail.id && d.exp > Date.now());
			if (found) {
				return { ...found, type };
			}
		}
	}

	async set(detail: ActivityDetail): Promise<void> {
		const indexed = await this.getIndexed();

		// biome-ignore lint/suspicious/noAssignInExpressions: it is ok
		(indexed[detail.type] ??= {})[detail.id] = detail;

		await this.save(await this.toStored());
		await this.notifyListeners(detail);
	}

	async addActivities(activities: ActivityDetail[]): Promise<void> {
		const indexed = await this.getIndexed();
		for (const activity of activities) {
			const bucket = indexed[activity.type] ?? {};
			bucket[activity.id] = activity;
			indexed[activity.type] = bucket;
		}
		await this.save(await this.toStored());
		this.indexedData = undefined;
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
				if (storedDetail.exp <= Date.now()) {
					continue;
				}
				const detail: ActivityDetail = { ...storedDetail, type };
				byId[detail.id] = detail;
			}

			out[type] = byId;
		}

		return out;
	}

	async toStored(): Promise<StoredData> {
		const indexed = await this.getIndexed();
		const storedData = await this.getStored();
		const items: StoredActivityTypeModel = {};

		for (const [typeStr, byId] of Object.entries(indexed)) {
			const type = Number(typeStr) as ActivityType;
			const details = Object.values(byId ?? {}).filter(({ exp }) => exp > Date.now());
			items[type] = details.map(({ id, auth, exp }) => ({ auth, exp, id }));
		}

		return {
			items,
			lastSync: storedData.lastSync,
		};
	}

	async isExpired(): Promise<boolean> {
		this.storedData = await ActivityTrail.load();
		this.indexedData = undefined;

		const { lastSync } = this.storedData;
		if (lastSync === 0) {
			return true;
		}

		return Date.now() - lastSync > DAYS_1;
	}

	private async getStored(): Promise<StoredData> {
		if (!this.storedData) {
			this.storedData = await ActivityTrail.load();
		}
		return this.storedData;
	}

	private async getIndexed(): Promise<ActivityTypeRecord> {
		if (!this.indexedData) {
			this.indexedData = await this.toRecord();
		}
		return this.indexedData;
	}

	private static async load(): Promise<StoredData> {
		const stored = await lStorage.getItem<StoredData>(STORAGE_KEY);
		return stored ?? { items: {}, lastSync: 0 };
	}

	private async save(data: StoredData): Promise<void> {
		const next: StoredData = { ...data, lastSync: Date.now() };
		this.storedData = next;
		await lStorage.setItem<StoredData>(STORAGE_KEY, next);
	}
}

let cachedActivityTrail: ActivityTrail | undefined;
export function newActivityTrail() {
	if (!cachedActivityTrail) {
		cachedActivityTrail = new ActivityTrail();
	}
	return cachedActivityTrail;
}
