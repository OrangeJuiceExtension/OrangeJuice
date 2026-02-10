import type { ContentScriptContext } from '#imports';
import {
	type DarkModePreference,
	getDarkModePreference,
	toggleDarkModePreference,
} from '@/utils/dark-mode.ts';

const COMPONENT_NAME = 'oj-dark-mode-toggle';

const iconMarkup = (mode: DarkModePreference) => {
	if (mode === 'dark') {
		return `
			<svg class="oj-dark-mode-icon oj-dark-mode-icon--moon" aria-hidden="true" viewBox="0 0 24 24">
				<path d="M21.752 15.002A9.718 9.718 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.599.748-3.752A9.753 9.753 0 0 0 2.25 11.25c0 5.385 4.365 9.75 9.75 9.75a9.753 9.753 0 0 0 9.752-5.998Z" />
			</svg>
		`;
	}

	return `
		<svg class="oj-dark-mode-icon oj-dark-mode-icon--sun" aria-hidden="true" viewBox="0 0 24 24">
			<path d="M12 6.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z" />
			<path d="M12 2.5v2.25M12 19.25v2.25M4.75 12H2.5M21.5 12h-2.25M5.47 5.47 3.88 3.88M20.12 20.12l-1.59-1.59M18.53 5.47l1.59-1.59M3.88 20.12l1.59-1.59" />
		</svg>
	`;
};

const updateButton = (button: HTMLButtonElement, mode: DarkModePreference) => {
	button.innerHTML = iconMarkup(mode);
	button.setAttribute('data-mode', mode);
	button.setAttribute('aria-pressed', mode === 'dark' ? 'true' : 'false');
	button.title = mode === 'dark' ? 'Dark mode on' : 'Dark mode off';
};

export const darkModeToggle = async (
	ctx: ContentScriptContext,
	doc: Document,
	navbar: HTMLElement | null
) => {
	if (!navbar) {
		return;
	}

	const loginCell = navbar.querySelector<HTMLElement>('.oj-hn-login-cell');
	const pageTops = [...navbar.querySelectorAll<HTMLElement>('span.pagetop')];
	const target = loginCell ?? pageTops.at(-1) ?? navbar;

	if (target.querySelector(`.${COMPONENT_NAME}`)) {
		return;
	}

	const style = doc.createElement('style');
	style.innerHTML = `
		.${COMPONENT_NAME} {
			background: transparent !important;
			border: 0 !important;
			padding: 0;
			cursor: pointer;
			vertical-align: middle;
			color: inherit !important;
		}
		.${COMPONENT_NAME} .oj-dark-mode-icon {
			width: 12px;
			height: 12px;
			display: inline-block;
		}
		.${COMPONENT_NAME} .oj-dark-mode-icon--sun {
			fill: currentColor;
			stroke: currentColor;
			stroke-width: 1.6;
		}
		.${COMPONENT_NAME} .oj-dark-mode-icon--moon {
			fill: currentColor;
			stroke: none;
		}
		.${COMPONENT_NAME}[data-mode='dark'] .oj-dark-mode-icon--moon {
			fill: currentColor !important;
			stroke: none !important;
		}
	`;
	doc.head.appendChild(style);

	const button = doc.createElement('button');
	button.className = COMPONENT_NAME;
	button.type = 'button';
	button.setAttribute('aria-label', 'Toggle dark mode');

	let mode = await getDarkModePreference();
	updateButton(button, mode);

	const onClick = async (event: MouseEvent) => {
		event.preventDefault();
		event.stopPropagation();
		mode = await toggleDarkModePreference();
		updateButton(button, mode);
	};

	button.addEventListener('click', onClick);

	ctx.onInvalidated(() => {
		button.removeEventListener('click', onClick);
	});

	if (loginCell) {
		target.append(button);
	} else {
		target.append(doc.createTextNode(' | '), button);
	}
};
