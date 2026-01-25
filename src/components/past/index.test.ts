import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dom } from '@/utils/dom';
import { chooseDate, updateMonthAndDayOptions } from './index';

const MOCK_CONTEXT = {
	onInvalidated: vi.fn(),
} as any;

describe('past', () => {
	describe('updateMonthAndDayOptions', () => {
		let yearInput: HTMLSelectElement;
		let monthInput: HTMLSelectElement;
		let dayInput: HTMLSelectElement;
		let today: Date;
		let selectedDate: Date;

		beforeEach(() => {
			yearInput = document.createElement('select');
			monthInput = document.createElement('select');
			dayInput = document.createElement('select');

			today = new Date(2026, 0, 24);
			selectedDate = new Date(2026, 0, 23);

			yearInput.replaceChildren(...dom.createOptions(2026, 2007, -1, 2026));
			monthInput.replaceChildren(...dom.createOptions(1, 12, 1, 1));
			dayInput.replaceChildren(...dom.createOptions(1, 31, 1, 23));
		});

		it('should limit months to current month in current year', () => {
			updateMonthAndDayOptions(yearInput, monthInput, dayInput, today, selectedDate);

			const options = monthInput.querySelectorAll('option');
			expect(options.length).toBe(1);
			expect(options[0].value).toBe('1');
		});

		it('should allow all months for past years', () => {
			yearInput.value = '2025';

			updateMonthAndDayOptions(yearInput, monthInput, dayInput, today, selectedDate);

			const options = monthInput.querySelectorAll('option');
			expect(options.length).toBe(12);
		});

		it('should limit days to current day in current month + 1', () => {
			monthInput.value = '1';

			updateMonthAndDayOptions(yearInput, monthInput, dayInput, today, selectedDate);

			const options = dayInput.querySelectorAll('option');
			expect(options.length).toBe(25);
			// biome-ignore lint/style/useAtIndex: tests
			expect(options[options.length - 1].value).toBe('25');
		});

		it('should allow all 31 days for past months', () => {
			yearInput.value = '2025';
			monthInput.value = '12';

			updateMonthAndDayOptions(yearInput, monthInput, dayInput, today, selectedDate);

			const options = dayInput.querySelectorAll('option');
			expect(options.length).toBe(31);
		});

		it('should preserve current month selection when updating', () => {
			monthInput.value = '1';

			updateMonthAndDayOptions(yearInput, monthInput, dayInput, today, selectedDate);

			expect(monthInput.value).toBe('1');
		});

		it('should preserve current day selection when updating, tests browser DOM issues', () => {
			// Set to a past year to avoid maxDay limitations
			yearInput.replaceChildren(...dom.createOptions(2026, 2007, -1, 2025));
			dayInput.value = '15';

			updateMonthAndDayOptions(yearInput, monthInput, dayInput, today, selectedDate);

			expect(dayInput.value).toBe('15');
		});
	});

	describe('chooseDate', () => {
		beforeEach(() => {
			vi.clearAllMocks();
			document.body.innerHTML = `
				<table>
					<tbody>
						<tr id="bigbox">
							<td>
								<div>
									<div></div>
								</div>
							</td>
						</tr>
					</tbody>
				</table>
			`;
		});

		it('should not run if navigator element is missing', () => {
			document.body.innerHTML = '';

			chooseDate(document, MOCK_CONTEXT);

			expect(document.querySelector('#oj-go-form')).toBeNull();
		});

		it('should create year, month, and day dropdowns', () => {
			chooseDate(document, MOCK_CONTEXT);

			expect(document.querySelector('#oj-year-select')).not.toBeNull();
			expect(document.querySelector('#oj-month-select')).not.toBeNull();
			expect(document.querySelector('#oj-day-select')).not.toBeNull();
		});

		it('should create form with dropdowns', () => {
			chooseDate(document, MOCK_CONTEXT);

			const form = document.querySelector('#oj-go-form');
			expect(form).not.toBeNull();
		});

		it('should default to yesterday when no day parameter', () => {
			Object.defineProperty(window, 'location', {
				value: { search: '' },
				writable: true,
			});

			chooseDate(document, MOCK_CONTEXT);

			const yesterday = new Date();
			yesterday.setDate(yesterday.getDate() - 1);

			const yearInput = document.querySelector('#oj-year-select') as HTMLSelectElement;
			const monthInput = document.querySelector('#oj-month-select') as HTMLSelectElement;
			const dayInput = document.querySelector('#oj-day-select') as HTMLSelectElement;

			expect(Number.parseInt(yearInput.value, 10)).toBe(yesterday.getFullYear());
			expect(Number.parseInt(monthInput.value, 10)).toBe(yesterday.getMonth() + 1);
			expect(Number.parseInt(dayInput.value, 10)).toBe(yesterday.getDate());
		});

		it('should parse day parameter from URL', () => {
			Object.defineProperty(window, 'location', {
				value: { search: '?day=2025-12-15' },
				writable: true,
			});

			chooseDate(document, MOCK_CONTEXT);

			const yearInput = document.querySelector('#oj-year-select') as HTMLSelectElement;
			const monthInput = document.querySelector('#oj-month-select') as HTMLSelectElement;
			const dayInput = document.querySelector('#oj-day-select') as HTMLSelectElement;

			expect(yearInput.value).toBe('2025');
			expect(monthInput.value).toBe('12');
			expect(dayInput.value).toBe('15');
		});

		it('should navigate when year changes', () => {
			window.location = { href: '', search: '' } as any;

			chooseDate(document, MOCK_CONTEXT);

			const yearInput = document.querySelector('#oj-year-select') as HTMLSelectElement;
			yearInput.value = '2024';
			yearInput.dispatchEvent(new Event('change'));

			expect(window.location.href).toContain('/front?day=2024');
		});

		it('should navigate when month changes, but sets month to 1 because 6 does not exist in the existing chooseDate', () => {
			vi.useFakeTimers({ now: new Date(2026, 0, 25) });

			window.location = { href: '', search: '' } as any;
			chooseDate(document, MOCK_CONTEXT);
			const yearInput = document.querySelector('#oj-year-select') as HTMLSelectElement;
			yearInput.value = '2025';
			const monthInput = document.querySelector('#oj-month-select') as HTMLSelectElement;
			monthInput.value = '6';
			monthInput.dispatchEvent(new Event('change'));

			expect(window.location.href).toContain('/front?day=2025-1-24');

			vi.useRealTimers();
		});

		it('should navigate and default to current year/month on month change to the future', () => {
			window.location = { href: '', search: '' } as any;
			chooseDate(document, MOCK_CONTEXT);

			const monthInput = document.querySelector('#oj-month-select') as HTMLSelectElement;
			monthInput.value = '6';
			monthInput.dispatchEvent(new Event('change'));

			const today = new Date();

			expect(window.location.href).toContain(
				`/front?day=${today.getFullYear().toString()}-${today.getMonth() + 1}-${today.getDate() - 1}`
			);
		});

		it('should navigate when day changes', () => {
			window.location = { href: '', search: '' } as any;

			chooseDate(document, MOCK_CONTEXT);

			const dayInput = document.querySelector('#oj-day-select') as HTMLSelectElement;
			dayInput.value = '10';
			dayInput.dispatchEvent(new Event('change'));

			expect(window.location.href).toContain('/front?day=');
		});

		it('should register cleanup on context invalidation', () => {
			chooseDate(document, MOCK_CONTEXT);

			expect(MOCK_CONTEXT.onInvalidated).toHaveBeenCalled();
		});

		it('should clean up event listeners on invalidation', () => {
			chooseDate(document, MOCK_CONTEXT);

			const yearInput = document.querySelector('#oj-year-select') as HTMLSelectElement;
			const monthInput = document.querySelector('#oj-month-select') as HTMLSelectElement;
			const dayInput = document.querySelector('#oj-day-select') as HTMLSelectElement;

			const yearSpy = vi.spyOn(yearInput, 'removeEventListener');
			const monthSpy = vi.spyOn(monthInput, 'removeEventListener');
			const daySpy = vi.spyOn(dayInput, 'removeEventListener');

			const onInvalidatedCallback = MOCK_CONTEXT.onInvalidated.mock.calls[0][0];
			onInvalidatedCallback();

			expect(yearSpy).toHaveBeenCalledWith('change', expect.any(Function));
			expect(monthSpy).toHaveBeenCalledWith('change', expect.any(Function));
			expect(daySpy).toHaveBeenCalledWith('change', expect.any(Function));
		});

		it('should inject link button style', () => {
			chooseDate(document, MOCK_CONTEXT);

			const styles = document.querySelectorAll('style');
			const hasLinkButtonStyle = Array.from(styles).some((style) =>
				style.textContent?.includes('.oj-link-button')
			);

			expect(hasLinkButtonStyle).toBe(true);
		});
	});
});
