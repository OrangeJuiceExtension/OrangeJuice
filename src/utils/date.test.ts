import { describe, expect, it } from 'vitest';
import { parseDate } from '@/utils/date.ts';

describe('parseDate', () => {
	it('should parse valid date string', () => {
		const result = parseDate('2026-01-24');
		expect(result).toBeInstanceOf(Date);
		expect(result?.getFullYear()).toBe(2026);
		expect(result?.getMonth()).toBe(0);
		expect(result?.getDate()).toBe(24);
	});

	it('should return null for invalid date format', () => {
		expect(parseDate('2026/01/24')).toBeNull();
		expect(parseDate('01-24-2026')).toBeNull();
		expect(parseDate('invalid')).toBeNull();
		expect(parseDate('')).toBeNull();
	});

	it('should handle single digit months and days', () => {
		const result = parseDate('2026-5-9');
		expect(result?.getMonth()).toBe(4);
		expect(result?.getDate()).toBe(9);
	});
});
