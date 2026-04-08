import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const projectRoot = path.resolve(import.meta.dirname, '..');
const sourceLogoPath = path.join(projectRoot, 'docs', 'assets', 'image.png');

interface CloudConfig {
	blurId: string;
	cx: number;
	cy: number;
	height: number;
	opacity: number;
	width: number;
}

interface ImageThemeConfig {
	accentGlowEnd: string;
	accentGlowStart: string;
	backgroundStops: readonly string[];
	baseShadow: string;
	cardHaloLarge: string;
	cardHaloSmall: string;
	cloudColor: string;
	clouds: readonly CloudConfig[];
	floorColor: string;
	logoShadow: string;
	mistStops: readonly string[];
	sunGlowEnd: string;
	sunGlowStart: string;
}

interface ImageOutputConfig {
	filename: string;
	height: number;
	width: number;
}

interface RenderConfig {
	output: ImageOutputConfig;
	theme: ImageThemeConfig;
}

const lightTheme: ImageThemeConfig = {
	accentGlowEnd: '#FF7A00',
	accentGlowStart: '#FFAE52',
	backgroundStops: ['#4AA7FF', '#7FD2FF', '#C6ECFF', '#FFF0D4'],
	baseShadow: 'rgba(52, 117, 170, 0.18)',
	cardHaloLarge: 'rgba(255,255,255,0.22)',
	cardHaloSmall: 'rgba(255,255,255,0.18)',
	cloudColor: 'rgba(255, 255, 255, 0.92)',
	clouds: [
		{ blurId: 'blurSoft', cx: 250, cy: 150, height: 120, opacity: 0.78, width: 300 },
		{ blurId: 'blurSoft', cx: 960, cy: 135, height: 126, opacity: 0.72, width: 340 },
		{ blurId: 'blurWide', cx: 160, cy: 420, height: 110, opacity: 0.58, width: 260 },
		{ blurId: 'blurWide', cx: 1040, cy: 430, height: 116, opacity: 0.64, width: 290 },
		{ blurId: 'blurWide', cx: 610, cy: 520, height: 150, opacity: 0.5, width: 520 },
	],
	floorColor: 'rgba(255, 244, 224, 0.7)',
	logoShadow: 'rgba(20,57,89,0.28)',
	mistStops: ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.22)', 'rgba(255,255,255,0.1)'],
	sunGlowEnd: '#FFD289',
	sunGlowStart: '#FFF8D5',
};

const darkTheme: ImageThemeConfig = {
	accentGlowEnd: '#FF5A00',
	accentGlowStart: '#FF9B3D',
	backgroundStops: ['#071C2D', '#0D3352', '#18476A', '#2D6C86'],
	baseShadow: 'rgba(4, 20, 34, 0.45)',
	cardHaloLarge: 'rgba(104, 198, 255, 0.12)',
	cardHaloSmall: 'rgba(255, 161, 71, 0.08)',
	cloudColor: 'rgba(212, 236, 255, 0.24)',
	clouds: [
		{ blurId: 'blurSoft', cx: 255, cy: 160, height: 122, opacity: 0.64, width: 310 },
		{ blurId: 'blurSoft', cx: 965, cy: 140, height: 130, opacity: 0.58, width: 350 },
		{ blurId: 'blurWide', cx: 190, cy: 435, height: 120, opacity: 0.36, width: 285 },
		{ blurId: 'blurWide', cx: 1015, cy: 440, height: 118, opacity: 0.38, width: 300 },
		{ blurId: 'blurWide', cx: 610, cy: 520, height: 146, opacity: 0.28, width: 500 },
	],
	floorColor: 'rgba(11, 30, 48, 0.72)',
	logoShadow: 'rgba(0,0,0,0.52)',
	mistStops: ['rgba(82,167,224,0.04)', 'rgba(139,208,255,0.12)', 'rgba(82,167,224,0.04)'],
	sunGlowEnd: '#FF8D3A',
	sunGlowStart: '#FFD48A',
};

const outputs = {
	bannerLight: {
		filename: 'banner-1-1280x800.png',
		height: 800,
		width: 1280,
	},
	ogDark: {
		filename: 'og-card-dark-1200x630.png',
		height: 630,
		width: 1200,
	},
	ogLight: {
		filename: 'og-card-1200x630.png',
		height: 630,
		width: 1200,
	},
} as const satisfies Record<string, ImageOutputConfig>;

const renders = [
	{ output: outputs.ogLight, theme: lightTheme },
	{ output: outputs.ogDark, theme: darkTheme },
	{ output: outputs.bannerLight, theme: lightTheme },
] as const satisfies readonly RenderConfig[];

const getLogoMetrics = (output: ImageOutputConfig): { left: number; size: number; top: number } => {
	const size = Math.round(output.width * 0.3);
	const top = Math.round(output.height * 0.17);
	const left = Math.round((output.width - size) / 2);
	return { left, size, top };
};

const createCloudSvg = (
	{ cx, cy, width, height, opacity, blurId }: CloudConfig,
	cloudColor: string
): string => {
	const left = cx - width / 2;
	const top = cy - height / 2;
	const circleY = top + height * 0.48;

	return `
		<g opacity="${opacity}" filter="url(#${blurId})">
			<ellipse cx="${cx}" cy="${cy}" rx="${width * 0.34}" ry="${height * 0.22}" fill="${cloudColor}" />
			<ellipse cx="${left + width * 0.34}" cy="${circleY}" rx="${width * 0.21}" ry="${height * 0.2}" fill="${cloudColor}" />
			<ellipse cx="${left + width * 0.52}" cy="${top + height * 0.3}" rx="${width * 0.26}" ry="${height * 0.25}" fill="${cloudColor}" />
			<ellipse cx="${left + width * 0.72}" cy="${circleY}" rx="${width * 0.24}" ry="${height * 0.22}" fill="${cloudColor}" />
			<ellipse cx="${left + width * 0.84}" cy="${top + height * 0.56}" rx="${width * 0.16}" ry="${height * 0.15}" fill="${cloudColor}" />
		</g>
	`;
};

const scaleCloud = (cloud: CloudConfig, output: ImageOutputConfig): CloudConfig => {
	const widthScale = output.width / 1200;
	const heightScale = output.height / 630;
	return {
		...cloud,
		cx: Math.round(cloud.cx * widthScale),
		cy: Math.round(cloud.cy * heightScale),
		height: Math.round(cloud.height * heightScale),
		width: Math.round(cloud.width * widthScale),
	};
};

const createBackgroundSvg = ({ output, theme }: RenderConfig): string => {
	const clouds = theme.clouds
		.map((cloud) => scaleCloud(cloud, output))
		.map((cloud) => createCloudSvg(cloud, theme.cloudColor))
		.join('');

	const [backgroundTop, backgroundMidTop, backgroundMidBottom, backgroundBottom] =
		theme.backgroundStops;
	const [mistStart, mistMiddle, mistEnd] = theme.mistStops;
	const widthCenter = Math.round(output.width / 2);
	const sunCenterY = Math.round(output.height * 0.448);
	const sunScaleY = Math.round(output.height * 0.54);
	const sunScaleX = Math.round(output.width * 0.283);
	const accentScale = Math.round(Math.min(output.width, output.height) * 0.333);
	const floorY = Math.round(output.height * 0.949);
	const floorRadiusX = Math.round(output.width * 0.433);
	const floorRadiusY = Math.round(output.height * 0.13);
	const mistY = Math.round(output.height * 0.929);
	const mistRadiusX = Math.round(output.width * 0.383);
	const mistRadiusY = Math.round(output.height * 0.092);
	const shadowY = Math.round(output.height * 0.825);
	const shadowRadiusX = Math.round(output.width * 0.127);
	const shadowRadiusY = Math.round(output.height * 0.041);
	const haloLarge = Math.round(Math.min(output.width, output.height) * 0.267);
	const haloSmall = Math.round(Math.min(output.width, output.height) * 0.232);

	return `
		<svg width="${output.width}" height="${output.height}" viewBox="0 0 ${output.width} ${output.height}" fill="none" xmlns="http://www.w3.org/2000/svg">
			<defs>
				<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stop-color="${backgroundTop}" />
					<stop offset="42%" stop-color="${backgroundMidTop}" />
					<stop offset="78%" stop-color="${backgroundMidBottom}" />
					<stop offset="100%" stop-color="${backgroundBottom}" />
				</linearGradient>
				<radialGradient id="sunGlow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(${widthCenter} ${sunCenterY}) rotate(90) scale(${sunScaleX} ${sunScaleY})">
					<stop offset="0%" stop-color="${theme.sunGlowStart}" stop-opacity="0.95" />
					<stop offset="38%" stop-color="${theme.sunGlowEnd}" stop-opacity="0.66" />
					<stop offset="100%" stop-color="${theme.sunGlowEnd}" stop-opacity="0" />
				</radialGradient>
				<radialGradient id="orangeGlow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(${widthCenter} ${Math.round(output.height * 0.463)}) rotate(90) scale(${accentScale} ${accentScale})">
					<stop offset="0%" stop-color="${theme.accentGlowStart}" stop-opacity="0.4" />
					<stop offset="100%" stop-color="${theme.accentGlowEnd}" stop-opacity="0" />
				</radialGradient>
				<linearGradient id="mist" x1="0" y1="0" x2="1" y2="0">
					<stop offset="0%" stop-color="${mistStart}" />
					<stop offset="50%" stop-color="${mistMiddle}" />
					<stop offset="100%" stop-color="${mistEnd}" />
				</linearGradient>
				<filter id="blurSoft" x="-20%" y="-20%" width="140%" height="140%">
					<feGaussianBlur stdDeviation="8" />
				</filter>
				<filter id="blurWide" x="-20%" y="-20%" width="140%" height="140%">
					<feGaussianBlur stdDeviation="12" />
				</filter>
				<filter id="logoShadow" x="-40%" y="-40%" width="180%" height="180%">
					<feDropShadow dx="0" dy="24" stdDeviation="20" flood-color="${theme.logoShadow}" />
				</filter>
			</defs>
			<rect width="${output.width}" height="${output.height}" fill="url(#sky)" />
			<rect width="${output.width}" height="${output.height}" fill="url(#sunGlow)" />
			<rect width="${output.width}" height="${output.height}" fill="url(#orangeGlow)" />
			<ellipse cx="${widthCenter}" cy="${floorY}" rx="${floorRadiusX}" ry="${floorRadiusY}" fill="${theme.floorColor}" />
			<ellipse cx="${widthCenter}" cy="${mistY}" rx="${mistRadiusX}" ry="${mistRadiusY}" fill="url(#mist)" />
			${clouds}
			<g filter="url(#logoShadow)">
				<ellipse cx="${widthCenter}" cy="${shadowY}" rx="${shadowRadiusX}" ry="${shadowRadiusY}" fill="${theme.baseShadow}" />
				<circle cx="${widthCenter}" cy="${Math.round(output.height * 0.46)}" r="${haloLarge}" fill="${theme.cardHaloLarge}" />
				<circle cx="${widthCenter}" cy="${Math.round(output.height * 0.46)}" r="${haloSmall}" fill="${theme.cardHaloSmall}" />
			</g>
		</svg>
	`;
};

const writeImage = async (render: RenderConfig): Promise<void> => {
	const backgroundBuffer = Buffer.from(createBackgroundSvg(render));
	const outputPath = path.join(projectRoot, 'docs', 'assets', render.output.filename);
	const logoMetrics = getLogoMetrics(render.output);
	const logoBuffer = await sharp(sourceLogoPath)
		.resize(logoMetrics.size, logoMetrics.size, {
			fit: 'contain',
		})
		.png()
		.toBuffer();

	await sharp(backgroundBuffer)
		.composite([
			{
				input: logoBuffer,
				left: logoMetrics.left,
				top: logoMetrics.top,
			},
		])
		.png({
			adaptiveFiltering: true,
			compressionLevel: 9,
			effort: 10,
			palette: true,
			quality: 92,
		})
		.toFile(outputPath);

	const outputStats = await fs.stat(outputPath);
	console.log(`Wrote ${path.relative(projectRoot, outputPath)} (${outputStats.size} bytes)`);
};

const main = async (): Promise<void> => {
	for (const render of renders) {
		await writeImage(render);
	}
};

await main();
