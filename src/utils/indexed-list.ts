export class IndexedList<T> implements Iterable<T> {
	private readonly items: T[];
	private readonly indexMap: Map<string, number>;
	private readonly keyFn: (item: T) => string;

	constructor(items: T[], keyFn: (item: T) => string) {
		this.items = items;
		this.keyFn = keyFn;
		this.indexMap = new Map();

		for (let i = 0; i < items.length; i++) {
			const key = keyFn(items[i]);
			this.indexMap.set(key, i);
		}
	}

	get(key: string): T | undefined {
		const index = this.indexMap.get(key);
		return index !== undefined ? this.items[index] : undefined;
	}

	getNext(current: T): T | undefined {
		const key = this.keyFn(current);
		const index = this.indexMap.get(key);
		if (index !== undefined && index < this.items.length - 1) {
			return this.items[index + 1];
		}
		return undefined;
	}

	getPrevious(current: T): T | undefined {
		const key = this.keyFn(current);
		const index = this.indexMap.get(key);
		if (index !== undefined && index > 0) {
			return this.items[index - 1];
		}
		return undefined;
	}

	first(): T | undefined {
		return this.items.length > 0 ? this.items[0] : undefined;
	}

	last(): T | undefined {
		return this.items.length > 0 ? this.items.at(-1) : undefined;
	}

	get length(): number {
		return this.items.length;
	}

	toArray(): T[] {
		return [...this.items];
	}

	[Symbol.iterator](): Iterator<T> {
		let index = 0;
		const items = this.items;

		return {
			next(): IteratorResult<T> {
				if (index < items.length) {
					return { value: items[index++], done: false };
				}
				return { value: undefined, done: true };
			},
		};
	}
}
