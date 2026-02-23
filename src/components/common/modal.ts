import type { ContentScriptContext } from '#imports';

const HN_ORANGE = '#ff6600';
const HN_BACKGROUND = '#f6f6ef';

export interface ModalOptions {
	content: string | HTMLElement;
	ctx: ContentScriptContext;
	doc: Document;
	onClose?: () => void;
	variant?: 'default' | 'shortcuts';
}

export const createModal = (options: ModalOptions): HTMLElement => {
	const { doc, ctx, content, onClose, variant = 'default' } = options;
	const isDarkMode = doc.documentElement.classList.contains('oj-dark-mode');
	const isShortcuts = variant === 'shortcuts';
	const shortcutsBg = isDarkMode ? 'rgb(48, 41, 33)' : '#f6f6ef';
	const shortcutsText = isDarkMode ? '#e8e6e3' : '#242424';

	const overlay = doc.createElement('div');
	overlay.style.cssText = `
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 10000;
	`;

	const modal = doc.createElement('div');
	modal.style.cssText = `
		background-color: ${isShortcuts ? shortcutsBg : HN_BACKGROUND};
		border: ${isShortcuts ? '0' : `3px solid ${HN_ORANGE}`};
		padding: ${isShortcuts ? '16px 18px' : '20px'};
		max-width: ${isShortcuts ? '860px' : '620px'};
		max-height: 80vh;
		overflow-y: auto;
		box-shadow: ${isShortcuts ? '0 14px 36px rgba(0, 0, 0, 0.28)' : '0 4px 6px rgba(0, 0, 0, 0.1)'};
		color: ${isShortcuts ? shortcutsText : 'inherit'};
		border-radius: ${isShortcuts ? '8px' : '0'};
	`;

	if (typeof content === 'string') {
		modal.innerHTML = content;
	} else {
		modal.appendChild(content);
	}

	overlay.appendChild(modal);

	const hide = () => {
		if (overlay.parentElement) {
			overlay.remove();
			onClose?.();
		}
	};

	overlay.addEventListener('click', (e) => {
		if (e.target === overlay) {
			hide();
		}
	});

	const escapeHandler = (e: KeyboardEvent) => {
		if (e.key === 'Escape' || e.key === 'escape') {
			hide();
			doc.removeEventListener('keydown', escapeHandler);
		}
	};

	doc.addEventListener('keydown', escapeHandler);

	ctx.onInvalidated(() => {
		hide();
		doc.removeEventListener('keydown', escapeHandler);
	});

	modal.addEventListener('click', (e) => {
		e.stopPropagation();
	});

	return overlay;
};

export const showModal = (options: ModalOptions): void => {
	const overlay = createModal(options);
	options.doc.body.appendChild(overlay);
};
