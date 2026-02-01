import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContentScriptContext } from '#imports';
import { createServicesManager } from '@/services/manager.ts';
import { fetchTitle } from './fetch-title';

vi.mock('@/services/manager.ts', () => ({
	createServicesManager: vi.fn(),
}));

const fixtureHtml = readFileSync(
	join(__dirname, '..', 'remaining', '__fixtures__', 'hn-submit-page.html'),
	'utf-8'
);

describe('fetchTitle', () => {
	let mockContext: ContentScriptContext;
	let mockDoc: Document;
	let mockFetchJson: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		document.body.innerHTML = fixtureHtml;
		mockDoc = document;
		mockContext = {
			onInvalidated: vi.fn(),
		} as unknown as ContentScriptContext;

		mockFetchJson = vi.fn();
		vi.mocked(createServicesManager).mockReturnValue({
			getFetchRemoteService: () => ({
				fetchJson: mockFetchJson,
			}),
		} as any);
	});

	it('should create a fetch title button', () => {
		fetchTitle(mockDoc, mockContext);

		const urlInput = mockDoc.querySelector<HTMLInputElement>('input[name="url"]');
		const button = urlInput?.parentElement?.querySelector('button');

		expect(button).toBeTruthy();
		expect(button?.innerText).toBe('fetch title');
	});

	it('should prepend https:// to URLs without http', () => {
		mockFetchJson.mockResolvedValue({ title: 'Test Title' });

		fetchTitle(mockDoc, mockContext);

		const urlInput = mockDoc.querySelector<HTMLInputElement>('input[name="url"]');
		const titleInput = mockDoc.querySelector<HTMLInputElement>('input[name="title"]');
		const button = urlInput?.parentElement?.querySelector('button');

		if (!(urlInput && titleInput && button)) {
			throw new Error('Required elements not found');
		}

		urlInput.value = 'example.com';

		button.click();

		// The URL should have been called with https:// prepended
		expect(mockFetchJson).toHaveBeenCalledWith(
			expect.stringContaining(encodeURIComponent('https://example.com'))
		);
	});

	it('should not modify URLs that already start with http', () => {
		mockFetchJson.mockResolvedValue({ title: 'Test Title' });

		fetchTitle(mockDoc, mockContext);

		const urlInput = mockDoc.querySelector<HTMLInputElement>('input[name="url"]');
		const button = urlInput?.parentElement?.querySelector('button');

		if (!(urlInput && button)) {
			throw new Error('Required elements not found');
		}

		urlInput.value = 'https://example.com';

		button.click();

		expect(mockFetchJson).toHaveBeenCalledWith(
			expect.stringContaining(encodeURIComponent('https://example.com'))
		);
	});

	it('should return early if URL input is empty', () => {
		fetchTitle(mockDoc, mockContext);

		const urlInput = mockDoc.querySelector<HTMLInputElement>('input[name="url"]');
		const button = urlInput?.parentElement?.querySelector('button');

		if (!(urlInput && button)) {
			throw new Error('Required elements not found');
		}

		urlInput.value = '';

		button.click();

		expect(mockFetchJson).not.toHaveBeenCalled();
	});

	it('should register cleanup handler with context', () => {
		fetchTitle(mockDoc, mockContext);

		expect(mockContext.onInvalidated).toHaveBeenCalledWith(expect.any(Function));
	});
});
