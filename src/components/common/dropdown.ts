import type { ContentScriptContext } from '#imports';
import { dom } from '@/utils/dom';

export interface DropdownOptions {
	triggerElement: HTMLElement;
	dropdownElement: HTMLDivElement;
	doc: Document;
	ctx: ContentScriptContext;
	onToggle?: (isOpen: boolean) => void;
}

export const createDropdown = (options: DropdownOptions) => {
	const { triggerElement, dropdownElement, doc, ctx, onToggle } = options;

	let openState = 0;

	const updateOpenState = (newState: number) => {
		openState = newState;
		onToggle?.(openState === 1);
	};

	const clickHandler = (event: MouseEvent) => {
		if (dom.isClickModified(event)) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();

		dropdownElement.style.left = `${triggerElement.getBoundingClientRect().left}px`;
		dropdownElement.classList.toggle('active');
		updateOpenState(1 - openState);
	};

	triggerElement.addEventListener('click', clickHandler);

	const outsideClickHandler = (event: MouseEvent) => {
		if (openState === 0) {
			return;
		}

		const target = event.target as Node;
		if (!(dropdownElement.contains(target) || triggerElement.contains(target))) {
			dropdownElement.classList.remove('active');
			updateOpenState(1 - openState);
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
	});

	return {
		isOpen: () => openState === 1,
	};
};

export const createDropdownStyle = (className: string) => {
	return `
		.${className} {
			display: none;
			border: 1px solid #000;
			margin-top: 0px;
			position: absolute;
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
	
		.${className}.active {
			display: block;
		}
	
		.${className} a, .${className} a:visited {
			display: block;
			text-align: left;
			text-decoration: underline;
			height: 20px;
			padding: 0 5px;
			color: #000;
		}
	
		.${className} a {
			text-decoration: none !important;
		}
	
		html.oj-dark-mode .${className},
		html.oj-dark-mode .${className}.active {
			background: rgb(44, 42, 31);
			border-color: #e8e6e3;
			color: #e8e6e3;
		}
	
		html.oj-dark-mode .${className} a,
		html.oj-dark-mode .${className} a:visited {
			color: #fff2d4 !important;
			text-decoration: none !important;
		}
	`;
};
