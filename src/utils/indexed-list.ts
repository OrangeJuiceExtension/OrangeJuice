export class IndexedList<T> implements Iterable<T> {
	private readonly items: T[];
	private readonly indexMap: Map<string, number>;
	private readonly keyFn: (item: T) => string;

	constructor(items: T[], keyFn: (item: T) => string) {
		this.items = items;
		this.keyFn = keyFn;
		this.indexMap = new Map();

		for (const [i, item] of items.entries()) {
			const key = keyFn(item);
			this.indexMap.set(key, i);
		}
	}

	get(key: string): T | undefined {
		const index = this.indexMap.get(key);
		return index === undefined ? undefined : this.items[index];
	}

	getNext(current: T): T | undefined {
		const key = this.keyFn(current);
		const index = this.indexMap.get(key);
		if (index !== undefined && index < this.items.length - 1) {
			return this.items[index + 1];
		}
	}

	getPrevious(current: T): T | undefined {
		const key = this.keyFn(current);
		const index = this.indexMap.get(key);
		if (index !== undefined && index > 0) {
			return this.items[index - 1];
		}
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
		return this.items[Symbol.iterator]();
	}
}
