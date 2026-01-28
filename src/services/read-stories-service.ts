import { browser } from '@wxt-dev/browser';

export class ReadStoriesService {
	getVisits(stories: HNStory[]) {
		try {
			const visitPromises = stories.map((story) =>
				browser.history.getVisits({ url: story.url }).then((visits) => {
					if (visits.length > 0) {
						story.latestVisit = visits[0];
					}
					return story;
				})
			);
			return Promise.all(visitPromises);
		} catch (e) {
			console.error('Error in handleHideReadStories:', e);
		}
	}
}
