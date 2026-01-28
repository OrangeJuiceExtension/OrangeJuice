import { type GetItemOptions, storage } from '@wxt-dev/storage';

const lStorage = {
	getItem<TValue>(key: string, opts?: GetItemOptions<TValue>): Promise<TValue | null> {
		return storage.getItem(`local:${key}`, opts);
	},
	setItem<T>(key: string, value: T | null): Promise<void> {
		return storage.setItem(`local:${key}`, value);
	},
	clear(): Promise<void> {
		return storage.clear('local');
	},
};

export default lStorage;
