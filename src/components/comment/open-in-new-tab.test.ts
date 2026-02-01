import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createServicesManager } from '@/services/manager.ts';
import { openInNewTab } from './open-in-new-tab.ts';

const storiesWithBigboxHtml = readFileSync(
	join(__dirname, '..', 'story', '__fixtures__', 'stories-with-bigbox.html'),
	'utf-8'
);

vi.mock('@/services/manager.ts', () => ({
	createServicesManager: vi.fn(() => ({
		getBrowserTabService: vi.fn(() => ({
			createTab: vi.fn(),
		})),
	})),
}));

describe('open-in-new-tab (comments)', () => {
	let mockCreateTab: ReturnType<typeof vi.fn>;
	let mockCtx: {
		onInvalidated: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		document.body.innerHTML = '';
		vi.clearAllMocks();

		mockCreateTab = vi.fn();
		mockCtx = {
			onInvalidated: vi.fn(),
		};

		vi.mocked(createServicesManager).mockReturnValue({
			getBrowserTabService: () => ({
				createTab: mockCreateTab,
			}),
		} as any);
	});

	afterEach(() => {
		document.body.innerHTML = '';
	});

	describe('comment links', () => {
		it('should open comment link in new tab when clicked', () => {
			const div = document.createElement('div');
			div.innerHTML = storiesWithBigboxHtml;
			document.body.appendChild(div);

			openInNewTab(mockCtx as any, document);

			// Find the comments link in the subtext
			const commentLinks = Array.from(div.querySelectorAll('.subtext a')).filter((link) =>
				link.textContent?.includes('comments')
			);
			expect(commentLinks.length).toBeGreaterThan(0);

			(commentLinks[0] as HTMLAnchorElement).click();

			expect(mockCreateTab).toHaveBeenCalledWith({
				url: expect.stringContaining('item?id=story1'),
				active: false,
			});
		});

		it('should handle multiple comment links', () => {
			const div = document.createElement('div');
			div.innerHTML = storiesWithBigboxHtml;
			document.body.appendChild(div);

			openInNewTab(mockCtx as any, document);

			const commentLinks = Array.from(div.querySelectorAll('.subtext a')).filter((link) =>
				link.textContent?.includes('comments')
			);
			expect(commentLinks.length).toBeGreaterThan(1);

			(commentLinks[0] as HTMLAnchorElement).click();
			(commentLinks[1] as HTMLAnchorElement).click();

			expect(mockCreateTab).toHaveBeenCalledTimes(2);
		});

		it('should prevent default navigation for comment links', () => {
			const div = document.createElement('div');
			div.innerHTML = storiesWithBigboxHtml;
			document.body.appendChild(div);

			openInNewTab(mockCtx as any, document);

			const commentLink = Array.from(div.querySelectorAll('.subtext a')).find((link) =>
				link.textContent?.includes('comments')
			) as HTMLAnchorElement;
			expect(commentLink).not.toBeNull();

			const event = new MouseEvent('click', { bubbles: true, cancelable: true });
			const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

			commentLink.dispatchEvent(event);

			expect(preventDefaultSpy).toHaveBeenCalled();
		});
	});

	describe('other links', () => {
		it('should not intercept title links', () => {
			const div = document.createElement('div');
			div.innerHTML = storiesWithBigboxHtml;
			document.body.appendChild(div);

			openInNewTab(mockCtx as any, document);

			const titleLink = div.querySelector('.titleline a') as HTMLAnchorElement;
			expect(titleLink).not.toBeNull();

			const event = new MouseEvent('click', { bubbles: true, cancelable: true });
			const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

			titleLink.dispatchEvent(event);

			expect(preventDefaultSpy).not.toHaveBeenCalled();
			expect(mockCreateTab).not.toHaveBeenCalled();
		});

		it('should not intercept user links', () => {
			const div = document.createElement('div');
			div.innerHTML = storiesWithBigboxHtml;
			document.body.appendChild(div);

			openInNewTab(mockCtx as any, document);

			const userLink = div.querySelector('a.hnuser') as HTMLAnchorElement;
			expect(userLink).not.toBeNull();

			const event = new MouseEvent('click', { bubbles: true, cancelable: true });
			const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

			userLink.dispatchEvent(event);

			expect(preventDefaultSpy).not.toHaveBeenCalled();
			expect(mockCreateTab).not.toHaveBeenCalled();
		});

		it('should not intercept hide links', () => {
			const div = document.createElement('div');
			div.innerHTML = storiesWithBigboxHtml;
			document.body.appendChild(div);

			openInNewTab(mockCtx as any, document);

			const hideLink = Array.from(div.querySelectorAll('.subtext a')).find(
				(link) => link.textContent === 'hide'
			) as HTMLAnchorElement;
			expect(hideLink).not.toBeNull();

			const event = new MouseEvent('click', { bubbles: true, cancelable: true });
			const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

			hideLink.dispatchEvent(event);

			expect(preventDefaultSpy).not.toHaveBeenCalled();
			expect(mockCreateTab).not.toHaveBeenCalled();
		});

		it('should handle clicks on non-anchor elements', () => {
			const div = document.createElement('div');
			div.innerHTML = '<div>Not a link</div>';
			document.body.appendChild(div);

			openInNewTab(mockCtx as any, document);

			div.click();

			expect(mockCreateTab).not.toHaveBeenCalled();
		});
	});

	describe('event cleanup', () => {
		it('should register cleanup callback', () => {
			openInNewTab(mockCtx as any, document);

			expect(mockCtx.onInvalidated).toHaveBeenCalledWith(expect.any(Function));
		});

		it('should remove event listener on invalidation', () => {
			const div = document.createElement('div');
			div.innerHTML = storiesWithBigboxHtml;
			document.body.appendChild(div);

			openInNewTab(mockCtx as any, document);

			// Get the cleanup function
			const cleanupFn = mockCtx.onInvalidated.mock.calls[0][0];

			// Call cleanup
			cleanupFn();

			// Try to click after cleanup
			const commentLink = Array.from(div.querySelectorAll('.subtext a')).find((link) =>
				link.textContent?.includes('comments')
			) as HTMLAnchorElement;
			commentLink.click();

			// Should not be called because listener was removed
			expect(mockCreateTab).not.toHaveBeenCalled();
		});
	});

	describe('edge cases', () => {
		it('should handle missing href attribute', () => {
			const div = document.createElement('div');
			div.innerHTML = '<div class="subtext"><a>50 comments</a></div>';
			document.body.appendChild(div);

			openInNewTab(mockCtx as any, document);

			const link = div.querySelector('a') as HTMLAnchorElement;
			link.click();

			// Should still call createTab but with empty/undefined href
			expect(mockCreateTab).toHaveBeenCalledWith({
				url: '',
				active: false,
			});
		});

		it('should handle empty document', () => {
			document.body.innerHTML = '';

			expect(() => {
				openInNewTab(mockCtx as any, document);
			}).not.toThrow();
		});
	});
});
