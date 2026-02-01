import type { ContentScriptContext } from '#imports';

const HN_ORANGE = '#ff6600';
const HN_BACKGROUND = '#f6f6ef';

export interface ModalOptions {
	doc: Document;
	ctx: ContentScriptContext;
	content: string | HTMLElement;
	onClose?: () => void;
}

export const createModal = (options: ModalOptions): HTMLElement => {
	const { doc, ctx, content, onClose } = options;

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
		background-color: ${HN_BACKGROUND};
		border: 3px solid ${HN_ORANGE};
		padding: 20px;
		max-width: 620px;
		max-height: 80vh;
		overflow-y: auto;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
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
			window.removeEventListener('keydown', escapeHandler);
		}
	};

	window.addEventListener('keydown', escapeHandler);

	ctx.onInvalidated(() => {
		hide();
		window.removeEventListener('keydown', escapeHandler);
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
