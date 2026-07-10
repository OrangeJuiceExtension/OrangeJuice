const SAFE_PROTOCOLS = new Set(['http:', 'https:']);

const resolveSafeUrl = (url: string, baseUrl: string): string | undefined => {
	try {
		const resolved = new URL(url, baseUrl);
		if (!SAFE_PROTOCOLS.has(resolved.protocol)) {
			return;
		}
		return resolved.toString();
	} catch {
		// Ignore invalid or unsupported URLs.
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
