import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContentScriptContext } from '#imports';
import { wrapBodyWithHnTemplate } from '@/components/common/hn-template.tsx';
import { loginTemplate } from '@/components/user/login-template.ts';

vi.mock('@/components/common/hn-template.tsx', () => ({
	wrapBodyWithHnTemplate: vi.fn((doc: Document) => {
		const bodySlot = doc.createElement('div');
		bodySlot.className = 'oj-hn-body';
		bodySlot.appendChild(doc.createElement('div'));
		doc.body.appendChild(bodySlot);
	}),
}));

describe('loginTemplate', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
		vi.clearAllMocks();
	});

	it('wraps the login page body and removes the hide style', async () => {
		const rafSpy = vi
			.spyOn(globalThis, 'requestAnimationFrame')
			.mockImplementation((cb: FrameRequestCallback) => {
				cb(0);
				return 0 as unknown as number;
			});

		window.history.pushState({}, '', '/login');
		document.body.appendChild(document.createElement('div'));

		await loginTemplate.main({} as ContentScriptContext);

		expect(wrapBodyWithHnTemplate).toHaveBeenCalled();
		expect(document.getElementById('oj-login-hide-body')).toBeNull();

		rafSpy.mockRestore();
	});

	it('does nothing on non-login pages', async () => {
		window.history.pushState({}, '', '/news');
		document.body.appendChild(document.createElement('div'));

		await loginTemplate.main({} as ContentScriptContext);

		expect(wrapBodyWithHnTemplate).not.toHaveBeenCalled();
		expect(document.getElementById('oj-login-hide-body')).toBeNull();
	});
});
