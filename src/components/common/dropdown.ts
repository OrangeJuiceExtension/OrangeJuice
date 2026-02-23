import type { ContentScriptContext } from '#imports';
import { dom } from '@/utils/dom';

export const NAVBAR_DROPDOWN_CLASS = 'oj-nav-dropdown';

interface OpenDropdownState {
	close: () => void;
	element: HTMLDivElement;
}

let openDropdownState: OpenDropdownState | undefined;

export interface DropdownOptions {
	ctx: ContentScriptContext;
	doc: Document;
	dropdownElement: HTMLDivElement;
	onToggle?: (isOpen: boolean) => void;
	triggerElement: HTMLElement;
}

export const createDropdown = (options: DropdownOptions) => {
	const { triggerElement, dropdownElement, doc, ctx, onToggle } = options;

	let openState = 0;

	const updateOpenState = (newState: number) => {
		openState = newState;
		onToggle?.(openState === 1);
	};

	const closeDropdown = () => {
		if (openState === 0) {
			return;
		}
		dropdownElement.classList.remove('active');
		updateOpenState(0);
		if (openDropdownState?.element === dropdownElement) {
			openDropdownState = undefined;
		}
	};

	const clickHandler = (event: MouseEvent) => {
		if (dom.isClickModified(event)) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();

		if (openState === 0 && openDropdownState?.element !== dropdownElement) {
			openDropdownState?.close();
		}

		dropdownElement.style.left = `${triggerElement.getBoundingClientRect().left}px`;
		dropdownElement.classList.toggle('active');
		updateOpenState(1 - openState);
		if (openState === 1) {
			openDropdownState = { element: dropdownElement, close: closeDropdown };
		} else if (openDropdownState?.element === dropdownElement) {
			openDropdownState = undefined;
		}
	};

	triggerElement.addEventListener('click', clickHandler);

	const outsideClickHandler = (event: MouseEvent) => {
		if (openState === 0) {
			return;
		}

		const target = event.target as Node;
		if (!(dropdownElement.contains(target) || triggerElement.contains(target))) {
			closeDropdown();
		}
	};
	doc.addEventListener('click', outsideClickHandler);

	const resizeHandler = (_e: Event) => {
		if (openState > 0) {
			dropdownElement.style.left = `${triggerElement.getBoundingClientRect().left}px`;
		}
	};
	window.addEventListener('resize', resizeHandler);

	ctx.onInvalidated(() => {
		triggerElement.removeEventListener('click', clickHandler);
		doc.removeEventListener('click', outsideClickHandler);
		window.removeEventListener('resize', resizeHandler);
		if (openDropdownState?.element === dropdownElement) {
			openDropdownState = undefined;
		}
	});

	return {
		isOpen: () => openState === 1,
	};
};

export const createDropdownStyle = (className: string) => {
	return `
		.${className},
		.${NAVBAR_DROPDOWN_CLASS} {
			display: none;
			border: 1px solid #000;
			margin-top: 0px;
			position: absolute;
			z-index: 11000;
			background-color: #fff;
			white-space: nowrap;
		}
	
		.${className}_button {
			user-select: none;
			color: inherit !important;
		}
	
		.${className}_button:hover {
			cursor: pointer;
		}
	
		.${className}.active,
		.${NAVBAR_DROPDOWN_CLASS}.active {
			display: block;
		}
	
		.${className} a, .${className} a:visited,
		.${NAVBAR_DROPDOWN_CLASS} a, .${NAVBAR_DROPDOWN_CLASS} a:visited {
			display: block;
			text-align: left;
			text-decoration: underline;
			height: 20px;
			padding: 0 5px;
			color: #000;
		}
	
		.${className} a,
		.${NAVBAR_DROPDOWN_CLASS} a {
			text-decoration: none !important;
		}
	
		html.oj-dark-mode .${className},
		html.oj-dark-mode .${className}.active,
		html.oj-dark-mode .${NAVBAR_DROPDOWN_CLASS},
		html.oj-dark-mode .${NAVBAR_DROPDOWN_CLASS}.active {
			background: rgb(44, 42, 31);
			border-color: #e8e6e3;
			color: #e8e6e3;
		}
	
		html.oj-dark-mode .${className} a,
		html.oj-dark-mode .${className} a:visited,
		html.oj-dark-mode .${NAVBAR_DROPDOWN_CLASS} a,
		html.oj-dark-mode .${NAVBAR_DROPDOWN_CLASS} a:visited {
			color: #fff2d4 !important;
			text-decoration: none !important;
		}
	`;
};
