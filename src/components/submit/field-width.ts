const SUBMIT_FIELD_COLUMNS = 80;
const SUBMIT_FIELD_SELECTOR = 'input[name="title"], input[name="url"], textarea';

export const widenFields = (doc: Document): void => {
	const submitFields = doc.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
		SUBMIT_FIELD_SELECTOR
	);

	for (const submitField of submitFields) {
		if (submitField instanceof HTMLInputElement) {
			submitField.size = SUBMIT_FIELD_COLUMNS;
			continue;
		}

		submitField.cols = SUBMIT_FIELD_COLUMNS;
	}
};
