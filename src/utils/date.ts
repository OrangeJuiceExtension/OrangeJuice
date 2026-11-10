const DATE_REGEX = /^(?<year>\d{4})-(?<month>\d{1,2})-(?<dayOfMonth>\d{1,2})$/u;

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
	if (!match?.groups) {
		return null;
	}
	const { year, month, dayOfMonth } = match.groups;
	if (!(year && month && dayOfMonth)) {
		return null;
	}
	return new Date(
		Number.parseInt(year, 10),
		Number.parseInt(month, 10) - 1,
		Number.parseInt(dayOfMonth, 10)
	);
};
