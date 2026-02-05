import { browser } from '#imports';
import type { HNStory } from '@/components/story/hn-story.ts';

export class ReadStoriesService {
	getVisits(stories: HNStory[]) {
		try {
			const visitPromises = stories.map(async (story) => {
				if (!story.url) {
					return Promise.resolve(story);
				}
				try {
					const visits = await browser.history.getVisits({
						url: story.url ? story.url : '',
					});
					if (visits.length > 0) {
						story.latestVisit = visits[0];
					}
					return story;
				} catch (e) {
					console.log({ error: 'failed to getVisits', e, story });
					return story;
				}
			});
			return Promise.all(visitPromises);
		} catch (e) {
			console.error({ error: 'Error in ReadStoriesService.getVisits', e });
		}
	}
}
