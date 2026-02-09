import type { ContentScriptContext } from '#imports';
import { fetchTitle } from '@/components/submit/fetch-title.ts';
import { prefill } from '@/components/submit/prefill.ts';
import { remaining } from '@/components/submit/remaining.ts';
import { paths } from '@/utils/paths.ts';
import type { ComponentFeature } from '@/utils/types.ts';

export const submit: ComponentFeature = {
	id: 'submit',
	loginRequired: true,
	matches: [
		`${paths.base}/submit*`,
		`${paths.base}/show*`,
		`${paths.base}/shownew*`,
		`${paths.base}/ask*`,
		`${paths.base}/asknew*`,
	],
	runAt: 'document_end',
	main(ctx: ContentScriptContext) {
		return Promise.all([
			Promise.resolve().then(() => prefill(document)),
			Promise.resolve().then(() => fetchTitle(ctx, document)),
			Promise.resolve().then(() => remaining(ctx, document)),
		]);
	},
};
