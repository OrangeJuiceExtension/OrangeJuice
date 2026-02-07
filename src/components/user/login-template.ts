import type { ContentScriptContext } from '#imports';
import { wrapBodyWithHnTemplate } from '@/components/common/hn-template.tsx';
import { paths } from '@/utils/paths.ts';
import type { ComponentFeature } from '@/utils/types.ts';

const HIDE_BODY_STYLE_ID = 'oj-login-hide-body';

const waitForBody = async () => {
	if (document.body) {
		return;
	}
	await new Promise<void>((resolve) => {
		const check = () => {
			if (document.body) {
				resolve();
				return;
			}
			requestAnimationFrame(check);
		};
		check();
	});
};

const waitForTemplateBody = async () => {
	await new Promise<void>((resolve) => {
		const check = () => {
			const bodySlot = document.querySelector('.oj-hn-body');
			if (bodySlot && bodySlot.childNodes.length > 0) {
				resolve();
				return;
			}
			requestAnimationFrame(check);
		};
		check();
	});
};

const hideBody = () => {
	if (document.getElementById(HIDE_BODY_STYLE_ID)) {
		return;
	}
	const style = document.createElement('style');
	style.id = HIDE_BODY_STYLE_ID;
	style.textContent = 'body { visibility: hidden; }';
	(document.head ?? document.documentElement).appendChild(style);
};

const showBody = () => {
	document.getElementById(HIDE_BODY_STYLE_ID)?.remove();
};

export const loginTemplate: ComponentFeature = {
	id: 'login-template',
	loginRequired: false,
	matches: [`${paths.base}/login*`],
	runAt: 'document_start',
	async main(_ctx: ContentScriptContext) {
		if (window.location.pathname !== '/login') {
			return;
		}

		hideBody();
		await waitForBody();
		wrapBodyWithHnTemplate(document);
		await waitForTemplateBody();
		showBody();
	},
};
