import { dom } from '@/utils/dom.ts';
import lStorage from '@/utils/local-storage.ts';

const TOPBAR_COLOR_STORAGE_KEY = 'oj_topbar_color';

const getTopbarCell = (doc: Document): HTMLTableCellElement | null =>
	doc.querySelector<HTMLTableCellElement>('span.pagetop')?.closest('td[bgcolor]') ??
	doc.querySelector<HTMLTableCellElement>('#hnmain > tbody > tr:first-child > td[bgcolor]') ??
	doc.querySelector<HTMLTableCellElement>('#hnmain > tr:first-child > td[bgcolor]') ??
	null;

export const previewTopbarColor = (doc: Document, color: string): void => {
	const cell = getTopbarCell(doc);
	if (!cell) {
		return;
	}
	cell.setAttribute('bgcolor', color);
	// Keep pale previews from matching the dark-mode page-background override.
	cell.style.setProperty('background-color', color, 'important');
	dom.ensureTopBarReadableText(doc);
};

export const getStoredTopbarColor = async (): Promise<string | undefined> => {
	const stored = await lStorage.getItem<string>(TOPBAR_COLOR_STORAGE_KEY);
	const value = stored?.trim();
	return value ? value : undefined;
};

export const syncStoredTopbarColor = async (doc: Document): Promise<void> => {
	const color = getTopbarCell(doc)?.getAttribute('bgcolor')?.trim();
	if (!color) {
		return;
	}

	await lStorage.setItem(TOPBAR_COLOR_STORAGE_KEY, color);
};
