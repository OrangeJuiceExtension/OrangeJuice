const LINK_TAG_REGEX = /<link\b[^>]*>/giu;
const SCRIPT_TAG_REGEX = /<script\b[^>]*>[\s\S]*?<\/script\s*>/giu;

export const stripFixtureElements = (html: string): string =>
	html.replace(SCRIPT_TAG_REGEX, '').replace(LINK_TAG_REGEX, '');
