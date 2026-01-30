export const focusClass = 'oj_focused_item';

export class ItemData {
	private readonly items: Map<string, HTMLElement>;
	private readonly keysArray: string[];
	activeItem?: HTMLElement;
	reply?: HTMLElement;

	constructor(items: Map<string, HTMLElement>) {
		this.items = items;
		this.keysArray = Array.from(items.keys());
	}

	get(id: string) {
		return this.items.get(id);
	}

	getPreviousKey(currentKey: string): string | undefined {
		const currentIndex = this.keysArray.indexOf(currentKey);
		if (currentIndex !== -1 && currentIndex > 0) {
			return this.keysArray[currentIndex - 1];
		}
		return undefined;
	}

	getNextKey(currentKey: string): string | undefined {
		const currentIndex = this.keysArray.indexOf(currentKey);
		if (currentIndex !== -1 && currentIndex < this.keysArray.length - 1) {
			return this.keysArray[currentIndex + 1];
		}
		return undefined;
	}

	private getElementInDirection(
		currentKey: string,
		getKey: (key: string) => string | undefined,
		recurse: (key: string, skip: boolean) => HTMLElement | undefined,
		skip = true
	): HTMLElement | undefined {
		const key = getKey(currentKey);
		if (key) {
			const element = this.items.get(key);
			const isHidden =
				element?.classList.contains('coll') || element?.classList.contains('noshow');
			const shouldSkip = skip && isHidden;
			return shouldSkip ? recurse(key, skip) : element;
		}
		return undefined;
	}

	getPreviousElement(currentKey: string, skip = true): HTMLElement | undefined {
		return this.getElementInDirection(
			currentKey,
			(key) => this.getPreviousKey(key),
			(key, skip) => this.getPreviousElement(key, skip),
			skip
		);
	}

	getNextElement(currentKey: string, skip = true): HTMLElement | undefined {
		return this.getElementInDirection(
			currentKey,
			(key) => this.getNextKey(key),
			(key, skip) => this.getNextElement(key, skip),
			skip
		);
	}

	first() {
		if (this.keysArray.length > 0) {
			return this.items.get(this.keysArray[0]);
		}
		return undefined;
	}

	last() {
		if (this.keysArray.length > 0) {
			const end = this.keysArray.at(-1);
			if (end) {
				return this.items.get(end);
			}
		}
		return undefined;
	}

	private getKeyForElement(element: HTMLElement): string | undefined {
		// First try the element's ID since that's usually the key
		if (this.items.has(element.id)) {
			return element.id;
		}
		// Fallback: search through the map
		for (const [key, el] of this.items) {
			if (el === element) {
				return key;
			}
		}
		return undefined;
	}

	private findClosestCollapsed(direction: 'up' | 'down'): HTMLElement | undefined {
		if (!this.activeItem) {
			return undefined;
		}

		const getNextKey =
			direction === 'up'
				? (key: string) => this.getPreviousKey(key)
				: (key: string) => this.getNextKey(key);

		let currentKey = this.getKeyForElement(this.activeItem);
		if (!currentKey) {
			return undefined;
		}

		while (currentKey) {
			const element = this.items.get(currentKey);
			if (element?.classList.contains('coll')) {
				return element;
			}

			currentKey = getNextKey(currentKey);
			if (!currentKey) {
				return undefined;
			}
		}

		return undefined;
	}

	closestCollapsedUp(): HTMLElement | undefined {
		return this.findClosestCollapsed('up');
	}

	closestCollapsedDown(): HTMLElement | undefined {
		return this.findClosestCollapsed('down');
	}
}

export function activateItem(itemData: ItemData, activeItem: HTMLElement) {
	let comment: HTMLElement = activeItem;
	if (!activeItem.classList.contains('tr.comtr')) {
		comment = activeItem.closest('tr.comtr') as HTMLElement;
	}

	if (comment) {
		deActivateItem(itemData);
		itemData.activeItem = comment;
		itemData.activeItem.classList.add(focusClass);
	}
}

export function deActivateItem(itemData: ItemData) {
	if (itemData.activeItem) {
		(document.activeElement as HTMLElement)?.blur();
		itemData.activeItem.classList.remove(focusClass);
		itemData.activeItem = undefined;
	}
}
