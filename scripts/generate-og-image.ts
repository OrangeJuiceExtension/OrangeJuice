import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const LOGO_SIZE = 360;
const LOGO_TOP = 108;
const LOGO_LEFT = Math.round((OG_WIDTH - LOGO_SIZE) / 2);
const OUTPUT_FILE = 'og-card-1200x630.png';
const CLOUD_COLOR = 'rgba(255, 255, 255, 0.92)';

const projectRoot = path.resolve(import.meta.dirname, '..');
const sourceLogoPath = path.join(projectRoot, 'docs', 'assets', 'image.png');
const outputImagePath = path.join(projectRoot, 'docs', 'assets', OUTPUT_FILE);

interface CloudConfig {
	blurId: string;
	cx: number;
	cy: number;
	height: number;
	opacity: number;
	width: number;
}

const createCloudSvg = ({ cx, cy, width, height, opacity, blurId }: CloudConfig): string => {
	const left = cx - width / 2;
	const top = cy - height / 2;
	const circleY = top + height * 0.48;

	return `
		<g opacity="${opacity}" filter="url(#${blurId})">
			<ellipse cx="${cx}" cy="${cy}" rx="${width * 0.34}" ry="${height * 0.22}" fill="${CLOUD_COLOR}" />
			<ellipse cx="${left + width * 0.34}" cy="${circleY}" rx="${width * 0.21}" ry="${height * 0.2}" fill="${CLOUD_COLOR}" />
			<ellipse cx="${left + width * 0.52}" cy="${top + height * 0.3}" rx="${width * 0.26}" ry="${height * 0.25}" fill="${CLOUD_COLOR}" />
			<ellipse cx="${left + width * 0.72}" cy="${circleY}" rx="${width * 0.24}" ry="${height * 0.22}" fill="${CLOUD_COLOR}" />
			<ellipse cx="${left + width * 0.84}" cy="${top + height * 0.56}" rx="${width * 0.16}" ry="${height * 0.15}" fill="${CLOUD_COLOR}" />
		</g>
	`;
};

const createBackgroundSvg = (): string => {
	const clouds = [
		{ cx: 250, cy: 150, width: 300, height: 120, opacity: 0.78, blurId: 'blurSoft' },
		{ cx: 960, cy: 135, width: 340, height: 126, opacity: 0.72, blurId: 'blurSoft' },
		{ cx: 160, cy: 420, width: 260, height: 110, opacity: 0.58, blurId: 'blurWide' },
		{ cx: 1040, cy: 430, width: 290, height: 116, opacity: 0.64, blurId: 'blurWide' },
		{ cx: 610, cy: 520, width: 520, height: 150, opacity: 0.5, blurId: 'blurWide' },
	]
		.map((cloud) => createCloudSvg(cloud))
		.join('');

	return `
		<svg width="${OG_WIDTH}" height="${OG_HEIGHT}" viewBox="0 0 ${OG_WIDTH} ${OG_HEIGHT}" fill="none" xmlns="http://www.w3.org/2000/svg">
			<defs>
				<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stop-color="#4AA7FF" />
					<stop offset="48%" stop-color="#7FD2FF" />
					<stop offset="78%" stop-color="#C6ECFF" />
					<stop offset="100%" stop-color="#FFF0D4" />
				</linearGradient>
				<radialGradient id="sunGlow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(600 282) rotate(90) scale(250 340)">
					<stop offset="0%" stop-color="#FFF8D5" stop-opacity="0.95" />
					<stop offset="38%" stop-color="#FFD289" stop-opacity="0.66" />
					<stop offset="100%" stop-color="#FFD289" stop-opacity="0" />
				</radialGradient>
				<radialGradient id="orangeGlow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(600 292) rotate(90) scale(210 210)">
					<stop offset="0%" stop-color="#FFAE52" stop-opacity="0.4" />
					<stop offset="100%" stop-color="#FF7A00" stop-opacity="0" />
				</radialGradient>
				<linearGradient id="mist" x1="0" y1="0" x2="1" y2="0">
					<stop offset="0%" stop-color="rgba(255,255,255,0.1)" />
					<stop offset="50%" stop-color="rgba(255,255,255,0.22)" />
					<stop offset="100%" stop-color="rgba(255,255,255,0.1)" />
				</linearGradient>
				<filter id="blurSoft" x="-20%" y="-20%" width="140%" height="140%">
					<feGaussianBlur stdDeviation="8" />
				</filter>
				<filter id="blurWide" x="-20%" y="-20%" width="140%" height="140%">
					<feGaussianBlur stdDeviation="12" />
				</filter>
				<filter id="logoShadow" x="-40%" y="-40%" width="180%" height="180%">
					<feDropShadow dx="0" dy="24" stdDeviation="20" flood-color="rgba(20,57,89,0.28)" />
				</filter>
			</defs>
			<rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="url(#sky)" />
			<rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="url(#sunGlow)" />
			<rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="url(#orangeGlow)" />
			<ellipse cx="600" cy="598" rx="520" ry="82" fill="rgba(255, 244, 224, 0.7)" />
			<ellipse cx="600" cy="585" rx="460" ry="58" fill="url(#mist)" />
			${clouds}
			<g filter="url(#logoShadow)">
				<ellipse cx="600" cy="520" rx="152" ry="26" fill="rgba(52, 117, 170, 0.18)" />
				<circle cx="600" cy="290" r="168" fill="rgba(255,255,255,0.22)" />
				<circle cx="600" cy="290" r="146" fill="rgba(255,255,255,0.18)" />
			</g>
		</svg>
	`;
};

const main = async (): Promise<void> => {
	const backgroundBuffer = Buffer.from(createBackgroundSvg());
	const logoBuffer = await sharp(sourceLogoPath)
		.resize(LOGO_SIZE, LOGO_SIZE, {
			fit: 'contain',
		})
		.png()
		.toBuffer();

	await sharp(backgroundBuffer)
		.composite([
			{
				input: logoBuffer,
				left: LOGO_LEFT,
				top: LOGO_TOP,
			},
		])
		.png({
			compressionLevel: 9,
			adaptiveFiltering: true,
		})
		.toFile(outputImagePath);

	const outputStats = await fs.stat(outputImagePath);
	console.log(`Wrote ${path.relative(projectRoot, outputImagePath)} (${outputStats.size} bytes)`);
};

await main();
