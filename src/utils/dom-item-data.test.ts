import { describe, expect, it } from 'vitest';
import { ItemData } from '@/utils/dom-item-data.ts';

describe('ItemData', () => {
	const createItemData = (
		count: number
	): { itemData: ItemData; elements: Map<string, HTMLElement> } => {
		const elements = new Map<string, HTMLElement>();
		for (let i = 1; i <= count; i++) {
			const el = document.createElement('div');
			el.id = `item-${i}`;
			elements.set(`key-${i}`, el);
		}
		return { itemData: new ItemData(elements), elements };
	};

	describe('get', () => {
		const testCases = [
			{ name: 'should return element for valid key', key: 'key-1', exists: true },
			{ name: 'should return undefined for invalid key', key: 'non-existent', exists: false },
		];

		for (const { name, key, exists } of testCases) {
			it(name, () => {
				const { itemData, elements } = createItemData(3);
				const element = itemData.get(key);
				if (exists) {
					expect(element).toBe(elements.get(key));
				} else {
					expect(element).toBeUndefined();
				}
			});
		}
	});

	describe('getPreviousKey', () => {
		const testCases = [
			{
				name: 'should return previous key for middle element',
				key: 'key-2',
				expected: 'key-1',
			},
			{
				name: 'should return previous key for last element',
				key: 'key-3',
				expected: 'key-2',
			},
			{
				name: 'should return undefined when at first element',
				key: 'key-1',
				expected: undefined,
			},
			{
				name: 'should return undefined for non-existent key',
				key: 'non-existent',
				expected: undefined,
			},
			{ name: 'should return undefined for empty string key', key: '', expected: undefined },
		];

		for (const { name, key, expected } of testCases) {
			it(name, () => {
				const { itemData } = createItemData(3);
				const prevKey = itemData.getPreviousKey(key);
				expect(prevKey).toBe(expected);
			});
		}
	});

	describe('getNextKey', () => {
		const testCases = [
			{ name: 'should return next key for first element', key: 'key-1', expected: 'key-2' },
			{ name: 'should return next key for middle element', key: 'key-2', expected: 'key-3' },
			{
				name: 'should return undefined when at last element',
				key: 'key-3',
				expected: undefined,
			},
			{
				name: 'should return undefined for non-existent key',
				key: 'non-existent',
				expected: undefined,
			},
			{ name: 'should return undefined for empty string key', key: '', expected: undefined },
		];

		for (const { name, key, expected } of testCases) {
			it(name, () => {
				const { itemData } = createItemData(3);
				const nextKey = itemData.getNextKey(key);
				expect(nextKey).toBe(expected);
			});
		}
	});

	describe('getPreviousElement', () => {
		const testCases = [
			{
				name: 'should return previous element for middle element',
				key: 'key-2',
				expectedKey: 'key-1',
			},
			{
				name: 'should return undefined when at first element',
				key: 'key-1',
				expectedKey: undefined,
			},
			{
				name: 'should return undefined for non-existent key',
				key: 'non-existent',
				expectedKey: undefined,
			},
		];

		for (const { name, key, expectedKey } of testCases) {
			it(name, () => {
				const { itemData, elements } = createItemData(3);
				const prevElement = itemData.getPreviousElement(key);
				if (expectedKey) {
					expect(prevElement).toBe(elements.get(expectedKey));
				} else {
					expect(prevElement).toBeUndefined();
				}
			});
		}

		const skipTestCases = [
			{
				name: 'should skip previous element with coll class',
				className: 'coll',
			},
			{
				name: 'should skip previous element with noshow class',
				className: 'noshow',
			},
		];

		for (const { name, className } of skipTestCases) {
			it(name, () => {
				const { itemData, elements } = createItemData(3);
				elements.get('key-2')?.classList.add(className);
				const prevElement = itemData.getPreviousElement('key-3');
				expect(prevElement).toBe(elements.get('key-1'));
			});
		}

		it('should skip multiple consecutive hidden elements', () => {
			const { itemData, elements } = createItemData(5);
			elements.get('key-4')?.classList.add('coll');
			elements.get('key-3')?.classList.add('noshow');
			elements.get('key-2')?.classList.add('coll');
			const prevElement = itemData.getPreviousElement('key-5');
			expect(prevElement).toBe(elements.get('key-1'));
		});

		it('should return undefined when all previous elements are hidden', () => {
			const { itemData, elements } = createItemData(3);
			elements.get('key-2')?.classList.add('coll');
			elements.get('key-1')?.classList.add('noshow');
			const prevElement = itemData.getPreviousElement('key-3');
			expect(prevElement).toBeUndefined();
		});

		it('should include hidden elements when skip=false', () => {
			const { itemData, elements } = createItemData(3);
			elements.get('key-2')?.classList.add('coll');
			const prevElement = itemData.getPreviousElement('key-3', false);
			expect(prevElement).toBe(elements.get('key-2'));
		});

		it('should include multiple consecutive hidden elements when skip=false', () => {
			const { itemData, elements } = createItemData(5);
			elements.get('key-4')?.classList.add('coll');
			elements.get('key-3')?.classList.add('noshow');
			elements.get('key-2')?.classList.add('coll');
			const prevElement = itemData.getPreviousElement('key-5', false);
			expect(prevElement).toBe(elements.get('key-4'));
		});
	});

	describe('getNextElement', () => {
		const testCases = [
			{
				name: 'should return next element for first element',
				key: 'key-1',
				expectedKey: 'key-2',
			},
			{
				name: 'should return undefined when at last element',
				key: 'key-3',
				expectedKey: undefined,
			},
			{
				name: 'should return undefined for non-existent key',
				key: 'non-existent',
				expectedKey: undefined,
			},
		];

		for (const { name, key, expectedKey } of testCases) {
			it(name, () => {
				const { itemData, elements } = createItemData(3);
				const nextElement = itemData.getNextElement(key);
				if (expectedKey) {
					expect(nextElement).toBe(elements.get(expectedKey));
				} else {
					expect(nextElement).toBeUndefined();
				}
			});
		}

		const skipTestCases = [
			{
				name: 'should skip next element with coll class',
				className: 'coll',
			},
			{
				name: 'should skip next element with noshow class',
				className: 'noshow',
			},
		];

		for (const { name, className } of skipTestCases) {
			it(name, () => {
				const { itemData, elements } = createItemData(3);
				elements.get('key-2')?.classList.add(className);
				const nextElement = itemData.getNextElement('key-1');
				expect(nextElement).toBe(elements.get('key-3'));
			});
		}

		it('should skip multiple consecutive hidden elements', () => {
			const { itemData, elements } = createItemData(5);
			elements.get('key-2')?.classList.add('coll');
			elements.get('key-3')?.classList.add('noshow');
			elements.get('key-4')?.classList.add('coll');
			const nextElement = itemData.getNextElement('key-1');
			expect(nextElement).toBe(elements.get('key-5'));
		});

		it('should return undefined when all next elements are hidden', () => {
			const { itemData, elements } = createItemData(3);
			elements.get('key-2')?.classList.add('coll');
			elements.get('key-3')?.classList.add('noshow');
			const nextElement = itemData.getNextElement('key-1');
			expect(nextElement).toBeUndefined();
		});

		it('should include hidden elements when skip=false', () => {
			const { itemData, elements } = createItemData(3);
			elements.get('key-2')?.classList.add('coll');
			const nextElement = itemData.getNextElement('key-1', false);
			expect(nextElement).toBe(elements.get('key-2'));
		});

		it('should include multiple consecutive hidden elements when skip=false', () => {
			const { itemData, elements } = createItemData(5);
			elements.get('key-2')?.classList.add('coll');
			elements.get('key-3')?.classList.add('noshow');
			elements.get('key-4')?.classList.add('coll');
			const nextElement = itemData.getNextElement('key-1', false);
			expect(nextElement).toBe(elements.get('key-2'));
		});
	});

	describe('edge cases with single item', () => {
		const testCases = [
			{
				name: 'should return undefined for getPreviousKey on single item',
				method: 'getPreviousKey' as const,
			},
			{
				name: 'should return undefined for getNextKey on single item',
				method: 'getNextKey' as const,
			},
			{
				name: 'should return undefined for getPreviousElement on single item',
				method: 'getPreviousElement' as const,
			},
			{
				name: 'should return undefined for getNextElement on single item',
				method: 'getNextElement' as const,
			},
		];

		for (const { name, method } of testCases) {
			it(name, () => {
				const { itemData } = createItemData(1);
				const result = itemData[method]('key-1');
				expect(result).toBeUndefined();
			});
		}
	});

	describe('edge cases with empty map', () => {
		const testCases = [
			{
				name: 'should return undefined for getPreviousKey on empty map',
				method: 'getPreviousKey' as const,
			},
			{
				name: 'should return undefined for getNextKey on empty map',
				method: 'getNextKey' as const,
			},
			{
				name: 'should return undefined for getPreviousElement on empty map',
				method: 'getPreviousElement' as const,
			},
			{
				name: 'should return undefined for getNextElement on empty map',
				method: 'getNextElement' as const,
			},
			{ name: 'should return undefined for get on empty map', method: 'get' as const },
		];

		for (const { name, method } of testCases) {
			it(name, () => {
				const { itemData } = createItemData(0);
				const result = itemData[method]('any-key');
				expect(result).toBeUndefined();
			});
		}
	});

	describe('first', () => {
		const testCases = [
			{
				name: 'should return first element with multiple items',
				count: 3,
				expectedKey: 'key-1',
			},
			{
				name: 'should return first element with single item',
				count: 1,
				expectedKey: 'key-1',
			},
			{ name: 'should return undefined with empty map', count: 0, expectedKey: undefined },
		];

		for (const { name, count, expectedKey } of testCases) {
			it(name, () => {
				const { itemData, elements } = createItemData(count);
				const firstElement = itemData.first();
				if (expectedKey) {
					expect(firstElement).toBe(elements.get(expectedKey));
				} else {
					expect(firstElement).toBeUndefined();
				}
			});
		}
	});

	describe('last', () => {
		const testCases = [
			{
				name: 'should return last element with multiple items',
				count: 3,
				expectedKey: 'key-3',
			},
			{ name: 'should return last element with single item', count: 1, expectedKey: 'key-1' },
			{ name: 'should return undefined with empty map', count: 0, expectedKey: undefined },
		];

		for (const { name, count, expectedKey } of testCases) {
			it(name, () => {
				const { itemData, elements } = createItemData(count);
				const lastElement = itemData.last();
				if (expectedKey) {
					expect(lastElement).toBe(elements.get(expectedKey));
				} else {
					expect(lastElement).toBeUndefined();
				}
			});
		}
	});

	describe('activeItem and reply properties', () => {
		const testCases = [
			{
				name: 'should initialize with undefined activeItem',
				property: 'activeItem' as const,
				initialValue: undefined,
			},
			{
				name: 'should initialize with undefined reply',
				property: 'reply' as const,
				initialValue: undefined,
			},
		];

		for (const { name, property, initialValue } of testCases) {
			it(name, () => {
				const { itemData } = createItemData(3);
				expect(itemData[property]).toBe(initialValue);
			});
		}

		const setTestCases = [
			{ name: 'should allow setting activeItem', property: 'activeItem' as const },
			{ name: 'should allow setting reply', property: 'reply' as const },
		];

		for (const { name, property } of setTestCases) {
			it(name, () => {
				const { itemData } = createItemData(3);
				const element = document.createElement('div');
				itemData[property] = element;
				expect(itemData[property]).toBe(element);
			});
		}
	});

	describe('closestCollapsed', () => {
		const directions = [
			{ name: 'Up', method: 'closestCollapsedUp' as const },
			{ name: 'Down', method: 'closestCollapsedDown' as const },
		];

		for (const { name: directionName, method } of directions) {
			describe(method, () => {
				const testCases = [
					{
						name: 'should return undefined when no active item',
						activeKey: undefined,
						collapsedKeys: [],
						expected: undefined,
					},
					{
						name: `should return undefined when no collapsed element exists ${directionName.toLowerCase()}`,
						activeKey: 'key-3',
						collapsedKeys: [],
						expected: undefined,
					},
					{
						name: `should find closest collapsed element ${directionName.toLowerCase()} active item`,
						activeKey: directionName === 'Up' ? 'key-4' : 'key-2',
						collapsedKeys: directionName === 'Up' ? ['key-2'] : ['key-4'],
						expected: directionName === 'Up' ? 'key-2' : 'key-4',
					},
					{
						name: `should skip non-collapsed elements and find first collapsed ${directionName.toLowerCase()}`,
						activeKey: directionName === 'Up' ? 'key-5' : 'key-1',
						collapsedKeys: directionName === 'Up' ? ['key-2'] : ['key-4'],
						expected: directionName === 'Up' ? 'key-2' : 'key-4',
					},
					{
						name: `should return immediate ${directionName === 'Up' ? 'previous' : 'next'} element if it is collapsed`,
						activeKey: directionName === 'Up' ? 'key-3' : 'key-1',
						collapsedKeys: ['key-2'],
						expected: 'key-2',
					},
					{
						name: `should find nearest collapsed when multiple exist ${directionName.toLowerCase()}`,
						activeKey: directionName === 'Up' ? 'key-5' : 'key-1',
						collapsedKeys: directionName === 'Up' ? ['key-1', 'key-3'] : ['key-3', 'key-5'],
						expected: 'key-3',
					},
					{
						name: `should return undefined when active item is ${directionName === 'Up' ? 'first' : 'last'}`,
						activeKey: directionName === 'Up' ? 'key-1' : 'key-5',
						collapsedKeys: ['key-2'],
						expected: undefined,
					},
					{
						name: 'should return active item itself if it is collapsed',
						activeKey: 'key-3',
						collapsedKeys: ['key-3'],
						expected: 'key-3',
					},
				];

				for (const { name, activeKey, collapsedKeys, expected } of testCases) {
					it(name, () => {
						const { itemData, elements } = createItemData(5);
						for (const key of collapsedKeys) {
							elements.get(key)?.classList.add('coll');
						}
						if (activeKey) {
							itemData.activeItem = elements.get(activeKey);
						}
						const result = itemData[method]();
						if (expected) {
							expect(result).toBe(elements.get(expected));
						} else {
							expect(result).toBeUndefined();
						}
					});
				}
			});
		}
	});
});
