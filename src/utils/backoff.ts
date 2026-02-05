export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function withBackoff(
	fn: () => Promise<void>,
	{
		sleepBetweenAttemptsMs = 2000,
		retries = Number.POSITIVE_INFINITY,
		baseDelayMs = 2000,
		maxDelayMs = 30_000,
		jitter = true,
	}: {
		sleepBetweenAttemptsMs?: number;
		retries?: number;
		baseDelayMs?: number;
		maxDelayMs?: number;
		jitter?: boolean;
	} = {}
): Promise<void> {
	let attempt = 0;

	while (true) {
		try {
			await sleep(sleepBetweenAttemptsMs);
			await fn();
			return;
		} catch (err) {
			if (attempt >= retries) {
				throw err;
			}

			const exp = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
			const delay = jitter ? Math.floor(exp * (0.5 + Math.random())) : exp;

			await sleep(delay);
			attempt++;
		}
	}
}
