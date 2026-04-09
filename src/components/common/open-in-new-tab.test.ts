import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContentScriptContext } from '#imports';
import { getOpenStoryNewTabPreference } from '@/utils/preferences.ts';
import { openInNewTab } from './open-in-new-tab.ts';

vi.mock('@/utils/preferences.ts', () => ({
	getOpenStoryNewTabPreference: vi.fn(async () => true),
}));

const createDoc = (): Document => {
	const doc = document.implementation.createHTMLDocument();

	const titleline = doc.createElement('span');
	titleline.className = 'titleline';
	const storyLink = doc.createElement('a');
	storyLink.href = 'https://example.com/story';
	storyLink.textContent = 'Example story';
	titleline.appendChild(storyLink);

	const subline = doc.createElement('span');
	subline.className = 'subline';
	const commentsLink = doc.createElement('a');
	commentsLink.href = 'item?id=1';
	commentsLink.innerText = '42 comments';
	commentsLink.textContent = '42 comments';
	subline.appendChild(commentsLink);

	doc.body.append(titleline, subline);
	return doc;
};

describe('openInNewTab', () => {
	let ctx: ContentScriptContext;

	beforeEach(() => {
		ctx = { onInvalidated: vi.fn() } as unknown as ContentScriptContext;
		vi.clearAllMocks();
	});

	it('opens story links in a new tab when the preference is enabled', async () => {
		const doc = createDoc();

		await openInNewTab(ctx, doc);

		const storyLink = doc.querySelector<HTMLAnchorElement>('.titleline > a');
		const commentsLink = doc.querySelector<HTMLAnchorElement>('.subline a');
		expect(storyLink?.target).toBe('_blank');
		expect(storyLink?.rel).toBe('noopener noreferrer');
		expect(commentsLink?.target).toBe('_blank');
		expect(commentsLink?.rel).toBe('noopener noreferrer');
	});

	it('keeps story links in the same tab when the preference is disabled', async () => {
		vi.mocked(getOpenStoryNewTabPreference).mockResolvedValueOnce(false);
		const doc = createDoc();

		await openInNewTab(ctx, doc);

		const storyLink = doc.querySelector<HTMLAnchorElement>('.titleline > a');
		const commentsLink = doc.querySelector<HTMLAnchorElement>('.subline a');
		expect(storyLink?.hasAttribute('target')).toBe(false);
		expect(storyLink?.hasAttribute('rel')).toBe(false);
		expect(commentsLink?.target).toBe('_blank');
		expect(commentsLink?.rel).toBe('noopener noreferrer');
	});
});
