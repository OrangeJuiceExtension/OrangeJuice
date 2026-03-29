import { browser } from '#imports';

export interface ReadStoryLookup {
	id: string;
	url?: string;
}

export interface ReadStoryVisit {
	id: string;
	latestVisit?: Browser.history.VisitItem;
}

export class ReadStoriesService {
	getVisits(stories: ReadStoryLookup[]): Promise<ReadStoryVisit[]> {
		try {
			const visitPromises = stories.map(async (story) => {
				if (!story.url) {
					return { id: story.id };
				}
				try {
					const visits = await browser.history.getVisits({
						url: story.url,
					});
					if (visits.length > 0) {
						return {
							id: story.id,
							latestVisit: visits[0],
						};
					}
					return { id: story.id };
				} catch (e) {
					console.log({ error: 'failed to getVisits', e, story });
					return { id: story.id };
				}
			});
			return Promise.all(visitPromises);
		} catch (e) {
			console.error({ error: 'Error in ReadStoriesService.getVisits', e });
			return Promise.resolve([]);
		}
	}
}
