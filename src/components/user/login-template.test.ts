import { beforeEach, describe, expect, it, vi } from 'vitest';
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
	const createFnidInput = (doc: Document): void => {
		const input = doc.createElement('input');
		input.type = 'hidden';
		input.name = 'fnid';
		doc.body.appendChild(input);
	};

	beforeEach(() => {
		document.body.innerHTML = '';
		vi.clearAllMocks();
	});

	const testCases: {
		name: string;
		pathname: string;
		username: string | null;
		hasFnid: boolean;
		shouldWrap: boolean;
	}[] = [
		{
			name: 'wraps the login page body',
			pathname: '/login',
			username: null,
			hasFnid: false,
			shouldWrap: true,
		},
		{
			name: 'wraps submit when logged out',
			pathname: '/submit',
			username: null,
			hasFnid: false,
			shouldWrap: true,
		},
		{
			name: 'skips submit when fnid is present',
			pathname: '/submit',
			username: null,
			hasFnid: true,
			shouldWrap: false,
		},
		{
			name: 'does nothing on non-login pages',
			pathname: '/news',
			username: null,
			hasFnid: false,
			shouldWrap: false,
		},
	];

	for (const testCase of testCases) {
		it(testCase.name, () => {
			window.history.pushState({}, '', testCase.pathname);
			document.body.appendChild(document.createElement('div'));

			if (testCase.hasFnid) {
				createFnidInput(document);
			}

			loginTemplate(document, testCase.username);

			if (testCase.shouldWrap) {
				expect(wrapBodyWithHnTemplate).toHaveBeenCalled();
			} else {
				expect(wrapBodyWithHnTemplate).not.toHaveBeenCalled();
			}
		});
	}
});
