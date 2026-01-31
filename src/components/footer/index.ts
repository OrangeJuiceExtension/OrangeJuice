import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import { addOrangeJuiceLink } from '@/components/footer/orange-juice-link.ts';
import { paths } from '@/utils/paths.ts';
import type { ComponentFeature } from '@/utils/types.ts';

export const footer: ComponentFeature = {
	id: 'footer',
	loginRequired: false,
	matches: [`${paths.base}/*`],
	runAt: 'document_end',
	main(ctx: ContentScriptContext) {
		addOrangeJuiceLink(ctx, document, footer.version || '');
	},
};
