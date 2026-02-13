const UNKNOWN_ERROR_MESSAGE = 'Unknown error';

export const getErrorMessage = (error: unknown): string => {
	if (error instanceof Error) {
		return error.message;
	}
	if (typeof error === 'string') {
		return error;
	}
	return UNKNOWN_ERROR_MESSAGE;
};
