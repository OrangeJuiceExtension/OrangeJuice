import type { ContentScriptContext } from '#imports';
import {
	type ActivityButtonConfig,
	initActivityButtons,
} from '@/components/common/activity-buttons.ts';
import { type ActivityTrail, newActivityTrail } from '@/utils/activity-trail.ts';
import { paths } from '@/utils/paths.ts';
import type { ComponentFeature } from '@/utils/types.ts';

export const activities: ComponentFeature = {
	id: 'activities',
	loginRequired: true,
	matches: [`${paths.base}/*`],
	runAt: 'document_end',
	main(ctx) {
		const username = activities.username;
		if (!username) {
			return;
		}

		const activityTrail = newActivityTrail();

		return Promise.all([
			Promise.resolve().then(() => {
				return init(ctx, document, activityTrail, {
					componentType: 'favorite',
					buttonClass: 'oj_favorite_link',
					buttonLabels: { active: 'un-favorite', inactive: 'favorite' },
				});
			}),
			Promise.resolve().then(() => {
				return init(ctx, document, activityTrail, {
					componentType: 'flag',
					buttonClass: 'oj_flag_link',
					buttonLabels: { active: 'un-flag', inactive: 'flag' },
				});
			}),
		]);
	},
};

const init = async (
	ctx: ContentScriptContext,
	doc: Document,
	activityTrail: ActivityTrail,
	config: ActivityButtonConfig
) => {
	let cleanupButtons: (() => void) | undefined;

	// Every time the ActivityTrail is updated, we want to update the
	// status of the buttons on the page.
	const activityTrailListener = async (): Promise<void> => {
		if (cleanupButtons) {
			cleanupButtons();
		}

		cleanupButtons = await initActivityButtons(
			doc,
			window.location.pathname,
			activityTrail,
			config
		);
	};

	await activityTrailListener();

	activityTrail.addListener(activityTrailListener);

	ctx.onInvalidated(() => {
		activityTrail.removeListener(activityTrailListener);
		if (cleanupButtons) {
			cleanupButtons();
		}
	});
};
