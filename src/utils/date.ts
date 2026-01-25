const DATE_REGEX = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;

export const months = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
];

export const parseDate = (dateString: string): Date | null => {
	const match = dateString.match(DATE_REGEX);
	if (!match) {
		return null;
	}
	const [, year, month, dayOfMonth] = match;
	return new Date(
		Number.parseInt(year, 10),
		Number.parseInt(month, 10) - 1,
		Number.parseInt(dayOfMonth, 10)
	);
};
