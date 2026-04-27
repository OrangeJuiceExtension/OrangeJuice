import { paths } from '@/utils/paths.ts';

const COPY_FEEDBACK_STYLE_ID = 'oj-copy-feedback-style';
const COPY_FEEDBACK_ID = 'oj-copy-feedback';
const COPY_FEEDBACK_VISIBLE_CLASS = 'oj-copy-feedback--visible';
const COPY_FEEDBACK_HIDE_DELAY_MS = 1400;

let hideTimeout: number | undefined;

const ensureCopyFeedbackStyle = (doc: Document): void => {
	if (doc.getElementById(COPY_FEEDBACK_STYLE_ID)) {
		return;
	}

	const style = doc.createElement('style');
	style.id = COPY_FEEDBACK_STYLE_ID;
	style.textContent = `
		#${COPY_FEEDBACK_ID} {
			position: fixed;
			top: 12px;
			right: 12px;
			z-index: 10000;
			padding: 6px 10px;
			font-size: 12px;
			font-weight: 600;
			color: #3f3f3f;
			pointer-events: none;
			background: #fbfbf4;
			border: 1px solid #d7d7c8;
			border-radius: 6px;
			opacity: 0;
			transform: translateY(-6px);
			transition:
				opacity 160ms ease,
				transform 160ms ease;
		}

		#${COPY_FEEDBACK_ID}.${COPY_FEEDBACK_VISIBLE_CLASS} {
			opacity: 1;
			transform: translateY(0);
		}

		html.oj-dark-mode #${COPY_FEEDBACK_ID} {
			color: #f3efe6;
			background: rgb(48, 41, 33);
			border-color: rgb(95, 82, 67);
		}
	`;
	doc.head.appendChild(style);
};

const getCopyFeedback = (doc: Document): HTMLDivElement => {
	let feedback = doc.getElementById(COPY_FEEDBACK_ID) as HTMLDivElement | null;
	if (feedback) {
		return feedback;
	}

	feedback = doc.createElement('div');
	feedback.id = COPY_FEEDBACK_ID;
	feedback.setAttribute('role', 'status');
	feedback.setAttribute('aria-live', 'polite');
	doc.body.appendChild(feedback);
	return feedback;
};

export const resolveHnUrl = (href: string): string => new URL(href, paths.base).toString();

export const copyTextToClipboard = async (value: string): Promise<boolean> => {
	if (!navigator.clipboard?.writeText) {
		return false;
	}

	await navigator.clipboard.writeText(value);
	return true;
};

export const showCopyFeedback = (doc: Document, message: string): void => {
	ensureCopyFeedbackStyle(doc);
	const feedback = getCopyFeedback(doc);
	feedback.textContent = message;
	feedback.classList.add(COPY_FEEDBACK_VISIBLE_CLASS);

	if (hideTimeout) {
		window.clearTimeout(hideTimeout);
	}

	hideTimeout = window.setTimeout(() => {
		feedback.classList.remove(COPY_FEEDBACK_VISIBLE_CLASS);
	}, COPY_FEEDBACK_HIDE_DELAY_MS);
};
