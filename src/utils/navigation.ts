const SAFE_PROTOCOLS = new Set(['http:', 'https:']);

const resolveSafeUrl = (url: string, baseUrl: string): string | undefined => {
	try {
		const resolved = new URL(url, baseUrl);
		if (!SAFE_PROTOCOLS.has(resolved.protocol)) {
			return undefined;
		}
		return resolved.toString();
	} catch {
		return undefined;
	}
};

export const openSafeUrlInNewTab = (
	url: string,
	baseUrl: string = window.location.href
): boolean => {
	const resolvedUrl = resolveSafeUrl(url, baseUrl);
	if (!resolvedUrl) {
		return false;
	}

	window.open(resolvedUrl, '_blank', 'noopener,noreferrer');
	return true;
};

export const navigateToSafeUrl = (url: string, baseUrl: string = window.location.href): boolean => {
	const resolvedUrl = resolveSafeUrl(url, baseUrl);
	if (!resolvedUrl) {
		return false;
	}

	window.location.href = resolvedUrl;
	return true;
};
