import { createRoot } from 'react-dom/client';
import { hideBody, showBody } from '@/components/common/hide-body.ts';
import './topcolors-template.css';

const TOPCOLORS_ROOT_ID = 'oj-topcolors-root';

interface TopColor {
	hex: string;
	href: string;
}

const SWATCH_SHAPES = ['circle', 'pill', 'diamond', 'squircle', 'hex'] as const;
const HEX_REGEX = /#?([0-9a-f]{6})/i;
const TOAST_ID = 'oj-topcolors-toast';
const TOAST_VISIBLE_CLASS = 'oj-topcolors__toast--visible';
const TOAST_HIDE_DELAY_MS = 1400;

let toastTimeout: number | undefined;

const pickRandomShape = (): (typeof SWATCH_SHAPES)[number] => {
	const index = Math.floor(Math.random() * SWATCH_SHAPES.length);
	return SWATCH_SHAPES[index];
};

const normalizeHex = (value: string): string | null => {
	const match = value.match(HEX_REGEX);
	if (!match) {
		return null;
	}
	return `#${match[1].toLowerCase()}`;
};

const showCopyToast = (doc: Document, value: string) => {
	let toast = doc.getElementById(TOAST_ID) as HTMLDivElement | null;
	if (!toast) {
		toast = doc.createElement('div');
		toast.id = TOAST_ID;
		toast.className = 'oj-topcolors__toast';
		doc.body.appendChild(toast);
	}

	toast.textContent = `Copied ${value}`;
	toast.classList.add(TOAST_VISIBLE_CLASS);

	if (toastTimeout) {
		window.clearTimeout(toastTimeout);
	}

	toastTimeout = window.setTimeout(() => {
		toast?.classList.remove(TOAST_VISIBLE_CLASS);
	}, TOAST_HIDE_DELAY_MS);
};

const copyToClipboard = async (_doc: Document, value: string): Promise<boolean> => {
	if (!navigator.clipboard?.writeText) {
		return false;
	}

	await navigator.clipboard.writeText(value);
	return true;
};

const extractTopColors = (doc: Document): TopColor[] => {
	const deduped = new Map<string, TopColor>();
	const anchors = Array.from(doc.querySelectorAll<HTMLAnchorElement>('a[href]'));

	for (const anchor of anchors) {
		const textHex = normalizeHex(anchor.textContent ?? '');
		const hrefHex = normalizeHex(anchor.getAttribute('href') ?? '');
		const hex = textHex ?? hrefHex;
		if (!hex || deduped.has(hex)) {
			continue;
		}
		deduped.set(hex, { hex, href: anchor.href });
	}

	if (deduped.size > 0) {
		return Array.from(deduped.values());
	}

	const bigbox = doc.querySelector('#bigbox');
	if (!bigbox) {
		return [];
	}

	const rows = Array.from(
		bigbox.querySelectorAll<HTMLTableRowElement>('td > table > tbody > tr')
	);
	for (const row of rows) {
		const cells = row.querySelectorAll<HTMLTableCellElement>('td');
		if (cells.length === 0) {
			continue;
		}

		const textHex = normalizeHex(cells[0].textContent ?? '');
		const bgHex = normalizeHex(cells[1]?.getAttribute('bgcolor') ?? '');
		const hex = textHex ?? bgHex;
		if (!hex || deduped.has(hex)) {
			continue;
		}

		deduped.set(hex, { hex, href: doc.location.href });
	}

	return Array.from(deduped.values());
};

const findContentContainer = (doc: Document): HTMLElement | null => {
	const bigbox = doc.querySelector('#bigbox');
	const table = bigbox?.querySelector('td > table');
	const tableContainer = table?.parentElement;
	if (tableContainer instanceof HTMLElement) {
		return tableContainer;
	}

	const anchors = Array.from(doc.querySelectorAll<HTMLAnchorElement>('a[href]'));
	for (const anchor of anchors) {
		const textHex = normalizeHex(anchor.textContent ?? '');
		const hrefHex = normalizeHex(anchor.getAttribute('href') ?? '');
		if (!(textHex || hrefHex)) {
			continue;
		}
		const td = anchor.closest('td');
		if (td instanceof HTMLElement) {
			return td;
		}
	}
	return null;
};

const TopcolorsTemplate = ({ colors }: { colors: TopColor[] }) => (
	<section className="oj-topcolors">
		<header className="oj-topcolors__intro">
			<h1 className="oj-topcolors__title">Top Colors</h1>
			<p className="oj-topcolors__subtitle">
				Browse Hacker News themes by color. {colors.length} colors available.
			</p>
		</header>
		<ol className="oj-topcolors__list">
			{colors.map((color, index) => {
				const shape = pickRandomShape();

				return (
					<li className="oj-topcolors__item" key={color.hex}>
						<a
							className="oj-topcolors__card"
							href={color.href}
							onClick={async (event) => {
								event.preventDefault();
								const didCopy = await copyToClipboard(document, color.hex);
								if (didCopy) {
									showCopyToast(document, color.hex);
								}
							}}
						>
							<span className="oj-topcolors__rank">{index + 1}</span>
							<span
								className={`oj-topcolors__swatch oj-topcolors__swatch--${shape}`}
								style={{ backgroundColor: color.hex }}
							/>
							<span className="oj-topcolors__meta">
								<span className="oj-topcolors__hex">{color.hex}</span>
							</span>
						</a>
					</li>
				);
			})}
		</ol>
	</section>
);

export const topcolorsTemplate = (doc: Document): void => {
	if (!window.location.pathname.startsWith('/topcolors')) {
		return;
	}

	const colors = extractTopColors(doc);
	const container = findContentContainer(doc);
	if (!container) {
		return;
	}

	if (doc.getElementById(TOPCOLORS_ROOT_ID)) {
		return;
	}

	hideBody(doc);

	container.replaceChildren();
	const root = doc.createElement('div');
	root.id = TOPCOLORS_ROOT_ID;
	container.appendChild(root);
	createRoot(root).render(<TopcolorsTemplate colors={colors} />);

	showBody(doc);
};
