import { describe, expect, it, vi } from 'vitest';
import { withBackoff } from '@/utils/backoff.ts';

describe('withBackoff', () => {
	it('retries until success', async () => {
		vi.useFakeTimers();
		const fn = vi
			.fn()
			.mockRejectedValueOnce(new Error('fail'))
			.mockRejectedValueOnce(new Error('fail'))
			.mockResolvedValueOnce(undefined);

		const promise = withBackoff(fn, {
			baseDelayMs: 10,
			jitter: false,
			maxDelayMs: 10,
			retries: 3,
			sleepBetweenAttemptsMs: 0,
		});

		const expectation = expect(promise).resolves.toBeUndefined();
		await vi.runAllTimersAsync();
		await expectation;

		expect(fn).toHaveBeenCalledTimes(3);
		vi.useRealTimers();
	});

	it('throws after exceeding retries', async () => {
		vi.useFakeTimers();
		const fn = vi.fn().mockRejectedValue(new Error('fail'));

		const promise = withBackoff(fn, {
			baseDelayMs: 10,
			jitter: false,
			maxDelayMs: 10,
			retries: 1,
			sleepBetweenAttemptsMs: 0,
		});

		const expectation = expect(promise).rejects.toThrow('fail');
		await vi.runAllTimersAsync();
		await expectation;

		expect(fn).toHaveBeenCalledTimes(2);
		vi.useRealTimers();
	});
});
