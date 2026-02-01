import DOMPurify from 'dompurify';
import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import { parseDate } from '@/utils/date.ts';
import { dom } from '@/utils/dom.ts';
import { paths } from '@/utils/paths.ts';
import type { ComponentFeature } from '@/utils/types.ts';

export const updateMonthAndDayOptions = (
	yearSelect: HTMLSelectElement,
	monthSelect: HTMLSelectElement,
	daySelect: HTMLSelectElement,
	today: Date,
	selectedDate: Date
) => {
	const selectedYear = Number.parseInt(yearSelect.value, 10);
	const newYearValue = selectedYear || selectedDate.getFullYear();
	yearSelect.replaceChildren(...dom.createOptions(today.getFullYear(), 2007, -1, newYearValue));

	const isCurrentYear = newYearValue === today.getFullYear();
	const maxMonth = isCurrentYear ? today.getMonth() + 1 : 12;

	const selectedMonth = Number.parseInt(monthSelect.value, 10);
	const currentMonthValue = selectedMonth || selectedDate.getMonth() + 1;
	const newMonthValue = Math.min(currentMonthValue, maxMonth);

	monthSelect.replaceChildren(...dom.createOptions(1, maxMonth, 1, newMonthValue));

	const isCurrentMonth = isCurrentYear && newMonthValue === today.getMonth() + 1;
	const maxDay = isCurrentMonth ? today.getDate() + 1 : 31;

	const selectedDay = Number.parseInt(daySelect.value, 10);
	const currentDayValue = selectedDay || selectedDate.getDate();

	daySelect.replaceChildren(...dom.createOptions(1, maxDay, 1, currentDayValue));

	// Just because you update the options doesn't mean the DOM updates the select value
	daySelect.value = `${currentDayValue}`;
	monthSelect.value = `${newMonthValue}`;
	yearSelect.value = `${newYearValue}`;
};

export const chooseDate = (doc: Document, ctx: ContentScriptContext) => {
	const navigator = doc.querySelectorAll('#bigbox > td > div');
	if (!navigator.length) {
		return;
	}

	const today = new Date();
	today.setDate(today.getDate() - 1); // Default to the day before.

	const day = new URLSearchParams(window.location.search).get('day');
	const selectedDate = day ? (parseDate(day) ?? today) : today;

	const yearSelect = doc.createElement('select');
	yearSelect.id = 'oj-year-select';
	const monthSelect = doc.createElement('select');
	monthSelect.id = 'oj-month-select';
	const daySelect = doc.createElement('select');
	daySelect.id = 'oj-day-select';

	updateMonthAndDayOptions(yearSelect, monthSelect, daySelect, today, selectedDate);

	const yearChangeHandler = () => {
		updateMonthAndDayOptions(yearSelect, monthSelect, daySelect, today, selectedDate);
		dayChangeHandler();
	};

	const monthChangeHandler = () => {
		updateMonthAndDayOptions(yearSelect, monthSelect, daySelect, today, selectedDate);
		dayChangeHandler();
	};

	const dayChangeHandler = () => {
		const day = DOMPurify.sanitize(
			`${yearSelect.value}-${monthSelect.value}-${daySelect.value}`
		);
		window.location.href = `/front?day=${day}`;
	};

	yearSelect.addEventListener('change', yearChangeHandler);
	monthSelect.addEventListener('change', monthChangeHandler);
	daySelect.addEventListener('change', dayChangeHandler);

	const goForm = doc.createElement('form');
	goForm.id = 'oj-go-form';
	goForm.style.display = 'inline-block';
	goForm.style.paddingLeft = '4px';
	goForm.style.margin = '0px';
	goForm.append(yearSelect, '-', monthSelect, '-', daySelect);

	navigator[0].firstElementChild?.append(goForm);

	ctx.onInvalidated(() => {
		yearSelect.removeEventListener('change', yearChangeHandler);
		monthSelect.removeEventListener('change', monthChangeHandler);
		daySelect.removeEventListener('change', dayChangeHandler);
	});
};

export const past: ComponentFeature = {
	id: 'past',
	loginRequired: true,
	matches: [`${paths.base}/front*`],
	runAt: 'document_end',
	main(ctx: ContentScriptContext) {
		chooseDate(document, ctx);
	},
};
