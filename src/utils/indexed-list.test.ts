import { describe, expect, it } from 'vitest';
import { IndexedList } from './indexed-list';

describe('IndexedList', () => {
	interface TestItem {
		id: string;
		value: number;
	}

	const createTestItems = (): TestItem[] => [
		{ id: 'a', value: 1 },
		{ id: 'b', value: 2 },
		{ id: 'c', value: 3 },
		{ id: 'd', value: 4 },
		{ id: 'e', value: 5 },
	];

	describe('constructor', () => {
		it('should create an empty list', () => {
			const list = new IndexedList<TestItem>([], (item) => item.id);

			expect(list.length).toBe(0);
			expect(list.first()).toBeUndefined();
			expect(list.last()).toBeUndefined();
		});

		it('should create a list with items', () => {
			const items = createTestItems();
			const list = new IndexedList(items, (item) => item.id);

			expect(list.length).toBe(5);
		});

		it('should index items by key function', () => {
			const items = createTestItems();
			const list = new IndexedList(items, (item) => item.id);

			expect(list.get('a')).toEqual({ id: 'a', value: 1 });
			expect(list.get('c')).toEqual({ id: 'c', value: 3 });
			expect(list.get('e')).toEqual({ id: 'e', value: 5 });
		});
	});

	describe('get', () => {
		it('should return item by key', () => {
			const items = createTestItems();
			const list = new IndexedList(items, (item) => item.id);

			const item = list.get('b');
			expect(item).toEqual({ id: 'b', value: 2 });
		});

		it('should return undefined for non-existent key', () => {
			const items = createTestItems();
			const list = new IndexedList(items, (item) => item.id);

			const item = list.get('nonexistent');
			expect(item).toBeUndefined();
		});

		it('should handle empty list', () => {
			const list = new IndexedList<TestItem>([], (item) => item.id);

			const item = list.get('a');
			expect(item).toBeUndefined();
		});
	});

	describe('getNext', () => {
		it('should return next item', () => {
			const items = createTestItems();
			const list = new IndexedList(items, (item) => item.id);

			const first = list.get('a');
			const next = first ? list.getNext(first) : undefined;

			expect(next).toEqual({ id: 'b', value: 2 });
		});

		it('should return undefined for last item', () => {
			const items = createTestItems();
			const list = new IndexedList(items, (item) => item.id);

			const last = list.get('e');
			const next = last ? list.getNext(last) : undefined;

			expect(next).toBeUndefined();
		});

		it('should return undefined for non-existent item', () => {
			const items = createTestItems();
			const list = new IndexedList(items, (item) => item.id);

			const nonexistent = { id: 'nonexistent', value: 999 };
			const next = list.getNext(nonexistent);

			expect(next).toBeUndefined();
		});

		it('should traverse entire list', () => {
			const items = createTestItems();
			const list = new IndexedList(items, (item) => item.id);

			let current = list.first();
			const traversed: string[] = [];

			while (current) {
				traversed.push(current.id);
				current = list.getNext(current);
			}

			expect(traversed).toEqual(['a', 'b', 'c', 'd', 'e']);
		});
	});

	describe('getPrevious', () => {
		it('should return previous item', () => {
			const items = createTestItems();
			const list = new IndexedList(items, (item) => item.id);

			const last = list.get('e');
			const prev = last ? list.getPrevious(last) : undefined;

			expect(prev).toEqual({ id: 'd', value: 4 });
		});

		it('should return undefined for first item', () => {
			const items = createTestItems();
			const list = new IndexedList(items, (item) => item.id);

			const first = list.get('a');
			const prev = first ? list.getPrevious(first) : undefined;

			expect(prev).toBeUndefined();
		});

		it('should return undefined for non-existent item', () => {
			const items = createTestItems();
			const list = new IndexedList(items, (item) => item.id);

			const nonexistent = { id: 'nonexistent', value: 999 };
			const prev = list.getPrevious(nonexistent);

			expect(prev).toBeUndefined();
		});

		it('should traverse entire list in reverse', () => {
			const items = createTestItems();
			const list = new IndexedList(items, (item) => item.id);

			let current = list.last();
			const traversed: string[] = [];

			while (current) {
				traversed.push(current.id);
				current = list.getPrevious(current);
			}

			expect(traversed).toEqual(['e', 'd', 'c', 'b', 'a']);
		});
	});

	describe('first', () => {
		it('should return first item', () => {
			const items = createTestItems();
			const list = new IndexedList(items, (item) => item.id);

			const first = list.first();
			expect(first).toEqual({ id: 'a', value: 1 });
		});

		it('should return undefined for empty list', () => {
			const list = new IndexedList<TestItem>([], (item) => item.id);

			const first = list.first();
			expect(first).toBeUndefined();
		});

		it('should handle single item list', () => {
			const items = [{ id: 'single', value: 42 }];
			const list = new IndexedList(items, (item) => item.id);

			const first = list.first();
			expect(first).toEqual({ id: 'single', value: 42 });
		});
	});

	describe('last', () => {
		it('should return last item', () => {
			const items = createTestItems();
			const list = new IndexedList(items, (item) => item.id);

			const last = list.last();
			expect(last).toEqual({ id: 'e', value: 5 });
		});

		it('should return undefined for empty list', () => {
			const list = new IndexedList<TestItem>([], (item) => item.id);

			const last = list.last();
			expect(last).toBeUndefined();
		});

		it('should handle single item list', () => {
			const items = [{ id: 'single', value: 42 }];
			const list = new IndexedList(items, (item) => item.id);

			const last = list.last();
			expect(last).toEqual({ id: 'single', value: 42 });
		});

		it('should be same as first for single item list', () => {
			const items = [{ id: 'single', value: 42 }];
			const list = new IndexedList(items, (item) => item.id);

			expect(list.first()).toEqual(list.last());
		});
	});

	describe('length', () => {
		it('should return 0 for empty list', () => {
			const list = new IndexedList<TestItem>([], (item) => item.id);

			expect(list.length).toBe(0);
		});

		it('should return correct length', () => {
			const items = createTestItems();
			const list = new IndexedList(items, (item) => item.id);

			expect(list.length).toBe(5);
		});

		it('should return 1 for single item', () => {
			const items = [{ id: 'single', value: 42 }];
			const list = new IndexedList(items, (item) => item.id);

			expect(list.length).toBe(1);
		});
	});

	describe('toArray', () => {
		it('should return empty array for empty list', () => {
			const list = new IndexedList<TestItem>([], (item) => item.id);

			const arr = list.toArray();
			expect(arr).toEqual([]);
		});

		it('should return array copy of items', () => {
			const items = createTestItems();
			const list = new IndexedList(items, (item) => item.id);

			const arr = list.toArray();
			expect(arr).toEqual(items);
		});

		it('should return a new array (not reference)', () => {
			const items = createTestItems();
			const list = new IndexedList(items, (item) => item.id);

			const arr1 = list.toArray();
			const arr2 = list.toArray();

			expect(arr1).not.toBe(arr2);
			expect(arr1).toEqual(arr2);
		});

		it('should not allow mutation of internal array', () => {
			const items = createTestItems();
			const list = new IndexedList(items, (item) => item.id);

			const arr = list.toArray();
			arr.push({ id: 'f', value: 6 });

			expect(list.length).toBe(5);
			expect(list.get('f')).toBeUndefined();
		});
	});

	describe('edge cases', () => {
		it('should handle items with duplicate keys (last one wins)', () => {
			const items = [
				{ id: 'a', value: 1 },
				{ id: 'a', value: 2 },
			];
			const list = new IndexedList(items, (item) => item.id);

			// The second item with id 'a' will overwrite the first in the index
			const item = list.get('a');
			expect(item).toEqual({ id: 'a', value: 2 });
		});

		it('should handle numeric keys', () => {
			interface NumItem {
				id: number;
				name: string;
			}
			const items: NumItem[] = [
				{ id: 1, name: 'one' },
				{ id: 2, name: 'two' },
				{ id: 3, name: 'three' },
			];
			const list = new IndexedList(items, (item) => String(item.id));

			expect(list.get('2')).toEqual({ id: 2, name: 'two' });
		});

		it('should handle complex key function', () => {
			interface ComplexItem {
				firstName: string;
				lastName: string;
				value: number;
			}
			const items: ComplexItem[] = [
				{ firstName: 'John', lastName: 'Doe', value: 1 },
				{ firstName: 'Jane', lastName: 'Smith', value: 2 },
			];
			const list = new IndexedList(items, (item) => `${item.firstName}-${item.lastName}`);

			expect(list.get('John-Doe')).toEqual({ firstName: 'John', lastName: 'Doe', value: 1 });
			expect(list.get('Jane-Smith')).toEqual({
				firstName: 'Jane',
				lastName: 'Smith',
				value: 2,
			});
		});

		it('should handle bidirectional traversal from middle', () => {
			const items = createTestItems();
			const list = new IndexedList(items, (item) => item.id);

			const middle = list.get('c');
			expect(middle).toEqual({ id: 'c', value: 3 });

			const next = middle ? list.getNext(middle) : undefined;
			expect(next).toEqual({ id: 'd', value: 4 });

			const prev = middle ? list.getPrevious(middle) : undefined;
			expect(prev).toEqual({ id: 'b', value: 2 });
		});
	});

	describe('iterator', () => {
		it('should iterate over all items with for...of', () => {
			const items = createTestItems();
			const list = new IndexedList(items, (item) => item.id);

			const result: TestItem[] = [];
			for (const item of list) {
				result.push(item);
			}

			expect(result).toEqual(items);
		});

		it('should iterate over empty list', () => {
			const list = new IndexedList<TestItem>([], (item) => item.id);

			const result: TestItem[] = [];
			for (const item of list) {
				result.push(item);
			}

			expect(result).toEqual([]);
		});

		it('should work with spread operator', () => {
			const items = createTestItems();
			const list = new IndexedList(items, (item) => item.id);

			const result = [...list];

			expect(result).toEqual(items);
		});

		it('should work with Array.from', () => {
			const items = createTestItems();
			const list = new IndexedList(items, (item) => item.id);

			const result = Array.from(list);

			expect(result).toEqual(items);
		});

		it('should allow breaking out of loop', () => {
			const items = createTestItems();
			const list = new IndexedList(items, (item) => item.id);

			const result: TestItem[] = [];
			for (const item of list) {
				result.push(item);
				if (item.id === 'c') {
					break;
				}
			}

			expect(result).toEqual([
				{ id: 'a', value: 1 },
				{ id: 'b', value: 2 },
				{ id: 'c', value: 3 },
			]);
		});

		it('should allow multiple iterations', () => {
			const items = createTestItems();
			const list = new IndexedList(items, (item) => item.id);

			const result1: string[] = [];
			for (const item of list) {
				result1.push(item.id);
			}

			const result2: string[] = [];
			for (const item of list) {
				result2.push(item.id);
			}

			expect(result1).toEqual(['a', 'b', 'c', 'd', 'e']);
			expect(result2).toEqual(['a', 'b', 'c', 'd', 'e']);
		});

		it('should work with for...of and filtering', () => {
			const items = createTestItems();
			const list = new IndexedList(items, (item) => item.id);

			const result: TestItem[] = [];
			for (const item of list) {
				if (item.value % 2 === 0) {
					result.push(item);
				}
			}

			expect(result).toEqual([
				{ id: 'b', value: 2 },
				{ id: 'd', value: 4 },
			]);
		});

		it('should work with for...of and mapping', () => {
			const items = createTestItems();
			const list = new IndexedList(items, (item) => item.id);

			const result: string[] = [];
			for (const item of list) {
				result.push(`${item.id}-${item.value}`);
			}

			expect(result).toEqual(['a-1', 'b-2', 'c-3', 'd-4', 'e-5']);
		});

		it('should support destructuring with iterator', () => {
			const items = createTestItems();
			const list = new IndexedList(items, (item) => item.id);

			const [first, second, ...rest] = list;

			expect(first).toEqual({ id: 'a', value: 1 });
			expect(second).toEqual({ id: 'b', value: 2 });
			expect(rest).toEqual([
				{ id: 'c', value: 3 },
				{ id: 'd', value: 4 },
				{ id: 'e', value: 5 },
			]);
		});

		it('should work with single item', () => {
			const items = [{ id: 'single', value: 42 }];
			const list = new IndexedList(items, (item) => item.id);

			const result: TestItem[] = [];
			for (const item of list) {
				result.push(item);
			}

			expect(result).toEqual([{ id: 'single', value: 42 }]);
		});
	});
});
