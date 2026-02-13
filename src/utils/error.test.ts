import { describe, expect, it } from 'vitest';
import { getErrorMessage } from '@/utils/error.ts';

describe('getErrorMessage', () => {
	const testCases: Array<{ name: string; error: unknown; expected: string }> = [
		{
			name: 'returns message from Error',
			error: new Error('Boom'),
			expected: 'Boom',
		},
		{
			name: 'returns string error',
			error: 'Bad input',
			expected: 'Bad input',
		},
		{
			name: 'returns unknown fallback for objects',
			error: { message: 'Nope' },
			expected: 'Unknown error',
		},
		{
			name: 'returns unknown fallback for null',
			error: null,
			expected: 'Unknown error',
		},
	];

	for (const testCase of testCases) {
		it(testCase.name, () => {
			expect(getErrorMessage(testCase.error)).toBe(testCase.expected);
		});
	}
});
