import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const PROJECT_ROOT = path.resolve(import.meta.dirname, '..');
const ASSETS_DIRECTORY = path.join(PROJECT_ROOT, 'docs', 'assets');
const HOME_STYLES_PATH = path.join(PROJECT_ROOT, 'docs', 'home.css');
const WORDMARK_PATH = path.join(ASSETS_DIRECTORY, 'wordmark.svg');
const LIGHT_THEME_PATTERN = /body\.oj-home-page\s*\{([^}]+)\}/;
const DARK_THEME_PATTERN = /html\.oj-dark-mode\s+\.oj-home-page\s*\{([^}]+)\}/;
const COLOR_VARIABLE_PATTERN = /--([\w-]+):\s*(#[\da-f]{6}(?:[\da-f]{2})?);/gi;
const DESIGN_WIDTH = 1200;
const PAGE_MARGIN = 64;
const SANS_FONTS = 'Avenir Next, Avenir, Trebuchet MS, sans-serif';

interface Wordmark {
	svg: string;
	width: number;
}

interface ImageTheme {
	background: string;
	grain: string;
	ink: string;
	muted: string;
	orange: string;
	rule: string;
}

const OUTPUTS = [
	{ filename: 'og-card-1200x630.png', height: 630, theme: 'light', width: 1200 },
	{ filename: 'og-card-dark-1200x630.png', height: 630, theme: 'dark', width: 1200 },
	{ filename: 'banner-1-1280x800.png', height: 800, theme: 'light', width: 1280 },
] as const;

type ImageOutput = (typeof OUTPUTS)[number];

const readTheme = (styles: string, themePattern: RegExp): ImageTheme => {
	const themeBlock = styles.match(themePattern)?.[1];
	if (!themeBlock) {
		throw new Error(`Missing homepage theme matching ${themePattern.source}`);
	}
	const colors = new Map<string, string>();
	for (const match of themeBlock.matchAll(COLOR_VARIABLE_PATTERN)) {
		const [, name, value] = match;
		if (name && value) {
			colors.set(name, value);
		}
	}

	const color = (name: string): string => {
		const value = colors.get(name);
		if (!value) {
			throw new Error(`Missing homepage color --${name}`);
		}
		return value;
	};

	return {
		background: color('bg'),
		grain: color('home-grain'),
		ink: color('text'),
		muted: color('text-light'),
		orange: color('primary'),
		rule: color('border'),
	};
};

const createCardSvg = (output: ImageOutput, theme: ImageTheme, wordmark: Wordmark): string => {
	const designHeight = (output.height * DESIGN_WIDTH) / output.width;
	const centerX = DESIGN_WIDTH / 2;
	const centerY = designHeight / 2;
	const rightMargin = DESIGN_WIDTH - PAGE_MARGIN;
	const grainColor = theme.grain.slice(0, 7);
	const grainOpacity = Number.parseInt(theme.grain.slice(7) || 'ff', 16) / 255;
	const wordmarkSvg = wordmark.svg.replace(
		'<svg ',
		`<svg x="${(DESIGN_WIDTH - wordmark.width) / 2}" y="${centerY - 160}" `
	);

	return `
		<svg xmlns="http://www.w3.org/2000/svg" width="${output.width}" height="${output.height}" viewBox="0 0 ${DESIGN_WIDTH} ${designHeight}">
			<defs>
				<style>.wordmark-period { fill: ${theme.ink}; }</style>
				<pattern id="paper" width="6" height="6" patternUnits="userSpaceOnUse">
					<path d="M-1 1 1-1M0 6 6 0M5 7 7 5" stroke="${grainColor}" stroke-opacity="${grainOpacity}" fill="none" />
				</pattern>
			</defs>
			<rect width="${DESIGN_WIDTH}" height="${designHeight}" fill="${theme.background}" />
			<rect width="${DESIGN_WIDTH}" height="${designHeight}" fill="url(#paper)" />
			<rect width="${DESIGN_WIDTH}" height="5" fill="${theme.orange}" />
			<g font-family="${SANS_FONTS}">
				<text x="${centerX}" y="78" text-anchor="middle" font-size="18" fill="${theme.muted}">A browser extension for Hacker News</text>
				<path d="M${PAGE_MARGIN} 112H${rightMargin}" stroke="${theme.rule}" />
				<g color="${theme.orange}">${wordmarkSvg}</g>
				<text x="${centerX}" y="${centerY + 68}" text-anchor="middle" font-size="34" font-weight="600" letter-spacing="-0.85" fill="${theme.ink}">Hacker News, a little sweeter.</text>
				<text x="${centerX}" y="${centerY + 116}" text-anchor="middle" font-size="21" fill="${theme.muted}">Hide read stories. Reply inline. Pick up where you left off.</text>
				<path d="M${PAGE_MARGIN} ${designHeight - 106}H${rightMargin}" stroke="${theme.rule}" />
				<text x="${PAGE_MARGIN}" y="${designHeight - 59}" font-size="18" fill="${theme.muted}">Chrome · Firefox</text>
				<text x="${rightMargin}" y="${designHeight - 59}" text-anchor="end" font-size="18" font-weight="600" fill="${theme.ink}">oj-hn.com</text>
			</g>
		</svg>
	`;
};

const writeImage = async (
	output: ImageOutput,
	theme: ImageTheme,
	wordmark: Wordmark
): Promise<void> => {
	const outputPath = path.join(ASSETS_DIRECTORY, output.filename);
	await sharp(Buffer.from(createCardSvg(output, theme, wordmark)))
		.png({ adaptiveFiltering: true, compressionLevel: 9 })
		.toFile(outputPath);
	const { size } = await fs.stat(outputPath);
	console.log(`Wrote ${path.relative(PROJECT_ROOT, outputPath)} (${size} bytes)`);
};

const main = async (): Promise<void> => {
	const styles = await fs.readFile(HOME_STYLES_PATH, 'utf8');
	const svg = await fs.readFile(WORDMARK_PATH, 'utf8');
	const { width } = await sharp(Buffer.from(svg)).metadata();
	if (!width) {
		throw new Error('The Orange Juice wordmark must have an intrinsic width.');
	}
	const themes = {
		dark: readTheme(styles, DARK_THEME_PATTERN),
		light: readTheme(styles, LIGHT_THEME_PATTERN),
	};
	await Promise.all(
		OUTPUTS.map((output) => writeImage(output, themes[output.theme], { svg, width }))
	);
};

await main();
