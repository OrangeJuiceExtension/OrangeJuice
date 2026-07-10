import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	copyTextToClipboard,
	resolveHnUrl,
	showCopyFeedback,
} from '@/components/common/copy-feedback.ts';

describe('copy feedback', () => {
	let doc: Document;

	beforeEach(() => {
		doc = document.implementation.createHTMLDocument();
		vi.clearAllMocks();
		vi.useRealTimers();
	});

	it('resolves relative HN urls', () => {
		expect(resolveHnUrl('item?id=123')).toBe('https://news.ycombinator.com/item?id=123');
	});

	it('returns false when clipboard api is unavailable', async () => {
		Object.defineProperty(navigator, 'clipboard', {
			configurable: true,
			value: undefined,
		});

		await expect(copyTextToClipboard('hello')).resolves.toBe(false);
	});

	it('writes to the clipboard when available', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, 'clipboard', {
			configurable: true,
			value: { writeText },
		});

		await expect(copyTextToClipboard('hello')).resolves.toBe(true);
		expect(writeText).toHaveBeenCalledWith('hello');
	});

	it('shows and hides copy feedback without affecting document flow', () => {
		vi.useFakeTimers();

		showCopyFeedback(doc, 'Copied HN link');

		const feedback = doc.getElementById('oj-copy-feedback');
		expect(feedback?.textContent).toBe('Copied HN link');
		expect(feedback?.classList.contains('oj-copy-feedback--visible')).toBe(true);
		expect(doc.getElementById('oj-copy-feedback-style')?.textContent).toContain(
			'position: fixed'
		);

		vi.advanceTimersByTime(1400);

		expect(feedback?.classList.contains('oj-copy-feedback--visible')).toBe(false);
	});
});
