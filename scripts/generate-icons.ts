/** biome-ignore-all lint/performance/useTopLevelRegex: whocares */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const projectRoot = process.cwd();
const assetsDir = path.join(projectRoot, 'assets');
const iconsDir = path.join(projectRoot, 'public', 'icon');

// Try to “grab the logo out of the assets folder”
function findLogoFile(): string {
	const candidates = ['image.png'].map((f) => path.join(assetsDir, f));

	for (const p of candidates) {
		if (fs.existsSync(p)) {
			return p;
		}
	}

	// Fallback: first PNG in assets/
	const files = fs
		.readdirSync(assetsDir)
		.filter((f) => f.toLowerCase().endsWith('.png'))
		.map((f) => path.join(assetsDir, f));

	if (files.length === 0) {
		throw new Error(`No PNG files found in ${assetsDir}`);
	}

	return files[0];
}

// Infer size from filename (supports lots of patterns)
function inferSizeFromFilename(filename: string): number | null {
	const base = path.basename(filename).toLowerCase();

	// Common patterns:
	// icon-16.png, icon16.png, 16.png, icon_16x16.png, icon-128x128.png
	const m =
		base.match(/(?:^|[^0-9])(\d{2,4})x\1(?:[^0-9]|$)/) || // 128x128
		base.match(/(?:^|[^0-9])(\d{2,4})(?:[^0-9]|$)/); // 128

	if (!m) {
		return null;
	}

	const n = Number(m[1]);
	if (!Number.isFinite(n)) {
		return null;
	}

	// sanity bounds for icons
	if (n < 8 || n > 4096) {
		return null;
	}

	return n;
}

async function main() {
	if (!fs.existsSync(iconsDir)) {
		throw new Error(`Missing folder: ${iconsDir}`);
	}

	const logoPath = findLogoFile();
	const iconFiles = fs
		.readdirSync(iconsDir)
		.filter((f) => f.toLowerCase().endsWith('.png'))
		.map((f) => path.join(iconsDir, f));

	if (iconFiles.length === 0) {
		throw new Error(`No .png files found in ${iconsDir} to size against.`);
	}

	const targets = iconFiles
		.map((filePath) => ({ filePath, size: inferSizeFromFilename(filePath) }))
		.filter((t) => t.size !== null) as Array<{ filePath: string; size: number }>;

	if (targets.length === 0) {
		throw new Error(
			`Could not infer icon sizes from filenames in ${iconsDir}. ` +
				'Expected names like icon-16.png or icon_128x128.png.'
		);
	}

	console.log(`Logo: ${path.relative(projectRoot, logoPath)}`);
	console.log(`Updating ${targets.length} icons in ${path.relative(projectRoot, iconsDir)}...`);

	// Load once
	const logo = sharp(logoPath).ensureAlpha();

	// Generate and overwrite
	for (const { filePath, size } of targets) {
		const outRel = path.relative(projectRoot, filePath);

		// Resize with nice downsampling; preserve alpha if present
		const buf = await logo
			.clone()
			.resize(size, size, {
				fit: 'cover', // typical icon behavior; change to "contain" if you want padding
			})
			.png({
				compressionLevel: 9,
				adaptiveFiltering: true,
				palette: false, // keep full color
			})
			.toBuffer();

		fs.writeFileSync(filePath, buf);
		console.log(`  wrote ${outRel} (${size}x${size})`);
	}

	// Lossless PNG optimize using oxipng (fast, very effective)
	// oxipng CLI is available via the package bin
	// (works with bunx; also works by resolving the node_modules/.bin path)
	console.log('Optimizing PNGs with oxipng...');
	for (const { filePath } of targets) {
		// bunx is the simplest way to run package binaries
		execFileSync('bunx', ['oxipng', '-o', '4', '--strip', 'all', filePath], {
			stdio: 'inherit',
		});
	}

	console.log('Done.');
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
