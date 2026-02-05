import { ActivityId, type ActivityTrail } from '@/utils/activity-trail.ts';
import { DAYS_30 } from '@/utils/constants.ts';
import { dom } from '@/utils/dom.ts';

const unvPrefixPattern = /^unv_/;
const itemIdPattern = /[?&]id=(\d+)/;

export const idExtractors = new Map<
	string,
	(nav: Element) => { element: Element | null; id: string | undefined }
>([
	[
		'default',
		(nav) => {
			const element = nav.querySelector('[id^="unv_"]');
			return { element, id: element?.id.replace(unvPrefixPattern, '') };
		},
	],
	[
		'/jobs',
		(nav) => {
			const element = nav.querySelector<HTMLAnchorElement>('a[href*="item?id="]');
			return { element, id: element?.href.match(itemIdPattern)?.[1] };
		},
	],
]);

export interface ActivityButtonConfig {
	componentType: 'favorite' | 'flag' | 'vote';
	buttonClass: string;
	buttonLabels: { active: string; inactive: string };
}

const activityTypeFromClassList = (
	componentType: 'favorite' | 'flag' | 'vote',
	classList: DOMTokenList
): ActivityType | undefined => {
	// List section
	if (classList.contains('subline')) {
		switch (componentType) {
			case 'favorite':
				return ActivityId.FavoriteSubmissions;
			case 'flag':
				return ActivityId.FlagsSubmissions;
			case 'vote':
				return ActivityId.VotesSubmissions;
			default:
				return undefined;
		}
	}

	// Comments section
	if (classList.contains('comhead')) {
		switch (componentType) {
			case 'favorite':
				return ActivityId.FavoriteComments;
			case 'flag':
				return ActivityId.FlagsComments;
			case 'vote':
				return ActivityId.VotesComments;
			default:
				return undefined;
		}
	}

	// Top of an item page where you add a top level comment
	if (classList.contains('subtext')) {
		switch (componentType) {
			case 'favorite':
			case 'flag':
				return ActivityId.FavoriteSubmissions;
			case 'vote':
				return ActivityId.VotesSubmissions;
			default:
				return undefined;
		}
	}

	return undefined;
};

const hasButtonAlready = (nav: HTMLElement, config: ActivityButtonConfig) => {
	return (
		nav.querySelector(`.${config.buttonClass}`) ||
		[...nav.querySelectorAll('a')].find(
			(a) =>
				a.textContent === config.buttonLabels.active ||
				a.textContent === config.buttonLabels.inactive
		)
	);
};

export const initActivityButtons = async (
	doc: Document,
	pathname: string, // window.location.pathname
	activityTrail: ActivityTrail,
	config: ActivityButtonConfig
): Promise<() => void> => {
	const navs = [...doc.querySelectorAll('.comhead, .subline, .subtext')] as HTMLElement[];
	const extractId = idExtractors.get(pathname) || idExtractors.get('default');
	if (!extractId) {
		// biome-ignore lint/suspicious/noEmptyBlockStatements: nothing to do
		return () => {};
	}

	const cleanupHandlers: (() => void)[] = [];

	for (const nav of navs) {
		if (hasButtonAlready(nav, config)) {
			continue;
		}

		const { element: idElement, id: commentId } = extractId(nav);
		if (!commentId) {
			continue;
		}

		const activityType: ActivityType | undefined = activityTypeFromClassList(
			config.componentType,
			nav.classList
		);
		if (!activityType) {
			continue;
		}

		const activityDetail = await activityTrail.get({
			id: commentId,
			type: activityType,
		});

		const button = doc.createElement('button');
		button.textContent = activityDetail
			? config.buttonLabels.active
			: config.buttonLabels.inactive;
		button.classList.add('oj_link_button', config.buttonClass);

		const handleClick = async (e: Event) => {
			e.stopPropagation();
			e.preventDefault();

			button.disabled = true;
			try {
				const activityDetail = await activityTrail.get({
					id: commentId,
					type: activityType,
				});

				let authToken: string | undefined = activityDetail?.auth;
				if (!activityDetail) {
					authToken = await dom.getAuthToken(commentId, activityType);
				}
				if (!authToken) {
					console.log({ error: 'unable to find auth token', commentId, activityType });
					return;
				}

				const isActive = activityDetail !== undefined;
				const success = await dom.toggleActivityState(
					commentId,
					isActive,
					authToken,
					activityType
				);

				if (success) {
					if (activityDetail) {
						await activityTrail.remove(activityDetail);
					} else {
						await activityTrail.set({
							id: commentId,
							type: activityType,
							auth: authToken,
							exp: Date.now() + DAYS_30,
						});
					}

					button.textContent = isActive
						? config.buttonLabels.inactive
						: config.buttonLabels.active;
				}
			} catch (error) {
				console.error({ error, pathname, config });
			} finally {
				button.disabled = false;
			}
		};

		button.addEventListener('click', handleClick);

		const separator = document.createElement('span');
		separator.textContent = ' | ';

		cleanupHandlers.push(() => {
			button.removeEventListener('click', handleClick);
			separator.remove();
			button.remove();
		});

		idElement?.parentElement?.insertBefore(button, idElement.nextSibling);
		idElement?.parentElement?.insertBefore(separator, idElement.nextSibling);
	}

	return () => {
		for (const h of cleanupHandlers) {
			h();
		}
	};
};
