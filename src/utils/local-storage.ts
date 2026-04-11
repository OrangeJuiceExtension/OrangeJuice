import { type GetItemOptions, storage } from '@wxt-dev/storage';

export type StorageWatchCallback<T> = (newValue: T | null, oldValue: T | null) => void;

const lStorage = {
	getItem<TValue>(key: string, opts?: GetItemOptions<TValue>): Promise<TValue | null> {
		return storage.getItem(`local:${key}`, opts);
	},
	setItem<T>(key: string, value: T | null): Promise<void> {
		return storage.setItem(`local:${key}`, value);
	},
	// used for tests
	clear(): Promise<void> {
		return storage.clear('local');
	},
	watch<T>(key: string, cb: StorageWatchCallback<T>): () => void {
		return storage.watch(`local:${key}`, cb);
	},
};

export default lStorage;
