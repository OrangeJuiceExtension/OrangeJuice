/** Require a fixture element or recorded mock call instead of silently skipping a test step. */
export const getRequiredItem = <T>(items: ArrayLike<T>, index: number): T => {
	const item = items[index];
	if (item === undefined) {
		throw new Error(
			`Expected test item at index ${index}, but it is missing (length ${items.length}).`
		);
	}
	return item;
};
