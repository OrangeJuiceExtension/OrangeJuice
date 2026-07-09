import { describe, expect, it } from 'vitest';
import { getErrorMessage } from '@/utils/error.ts';

describe('getErrorMessage', () => {
	const testCases: Array<{ name: string; error: unknown; expected: string }> = [
		{
			error: new Error('Boom'),
			expected: 'Boom',
			name: 'returns message from Error',
		},
		{
			error: 'Bad input',
			expected: 'Bad input',
			name: 'returns string error',
		},
		{
			error: { message: 'Nope' },
			expected: 'Unknown error',
			name: 'returns unknown fallback for objects',
		},
		{
			error: null,
			expected: 'Unknown error',
			name: 'returns unknown fallback for null',
		},
	];

	for (const testCase of testCases) {
		it(testCase.name, () => {
			expect(getErrorMessage(testCase.error)).toBe(testCase.expected);
		});
	}
});
