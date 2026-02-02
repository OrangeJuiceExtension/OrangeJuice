import type { ContentScriptContext } from '#imports';
import { fetchTitle } from '@/components/submit/fetch-title.ts';
import { paths } from '@/utils/paths.ts';
import type { ComponentFeature } from '@/utils/types.ts';

export const submit: ComponentFeature = {
	id: 'submit',
	loginRequired: true,
	matches: [`${paths.base}/submit`],
	runAt: 'document_end',
	main(ctx: ContentScriptContext) {
		return Promise.all([Promise.resolve().then(() => fetchTitle(ctx, document))]);
	},
};
