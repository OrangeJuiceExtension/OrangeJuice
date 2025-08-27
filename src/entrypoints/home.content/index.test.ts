import { describe, it, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing';

import index from './index.ts';

describe('home.content.index', () => {
	beforeEach(() => {
		// Reset the in-memory state, including storage
		fakeBrowser.reset();
	});

	it('should work', async () => {
		const ctx = new ContentScriptContext('test');
		await index.main(ctx);
	});
});
