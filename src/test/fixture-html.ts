const LINK_TAG_REGEX = /<link\b[^>]*>/gi;
const SCRIPT_TAG_REGEX = /<script\b[^>]*>[\s\S]*?<\/script\s*>/gi;

export const stripFixtureElements = (html: string): string =>
	html.replace(SCRIPT_TAG_REGEX, '').replace(LINK_TAG_REGEX, '');
