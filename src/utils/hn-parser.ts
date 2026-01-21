import { paths } from '@/utils/paths.ts';

const POINTS_REGEX = /^(\d+)\s+points?$/;
const COMMENTS_REGEX = /^(\d+)\s+comments?$/;

export const parsePosition = (row: HTMLTableRowElement): number => {
	const rankText = row.querySelector('span.rank')?.textContent?.replace('.', '') || '0';
	return Number.parseInt(rankText, 10);
};

export const parseTitle = (row: HTMLTableRowElement): { title: string; url: string } => {
	const titleLink = row.querySelector<HTMLAnchorElement>('span.titleline > a');
	const href = titleLink?.getAttribute('href') || '';
	const url = href.length === 0 || href.startsWith('http') ? href : `${paths.base}/${href}`;
	return {
		title: titleLink?.textContent || '',
		url,
	};
};

export const parsePoints = (subtext: HTMLTableCellElement): number | null => {
	const scoreText = subtext.querySelector('span.score')?.textContent;
	const match = scoreText?.match(POINTS_REGEX);
	return match ? Number.parseInt(match[1], 10) : null;
};

export const parseComments = (subtext: HTMLTableCellElement): number | null => {
	const links = subtext.querySelectorAll<HTMLAnchorElement>('a');

	for (const link of links) {
		const href = link.getAttribute('href');
		if (!href?.startsWith('item?id=')) {
			continue;
		}

		const text = link.textContent;
		if (text === 'discuss') {
			return 0;
		}

		const match = text?.match(COMMENTS_REGEX);
		if (match) {
			return Number.parseInt(match[1], 10);
		}
	}

	return null;
};

export const parseHNStoriesPage = (element: HTMLElement | Document): HNStory[] => {
	const stories: HNStory[] = [];
	const storyRows = element.querySelectorAll<HTMLTableRowElement>('tr.athing');

	for (const storyRow of storyRows) {
		const id = storyRow.getAttribute('id');
		if (!id) {
			continue;
		}

		const position = parsePosition(storyRow);
		const { title, url } = parseTitle(storyRow);

		const subtext =
			storyRow.nextElementSibling?.querySelector<HTMLTableCellElement>('td.subtext');

		stories.push({
			position,
			id,
			title,
			url,
			points: subtext ? parsePoints(subtext) : null,
			author: subtext?.querySelector('a.hnuser')?.textContent || null,
			postedDate: subtext?.querySelector('span.age')?.getAttribute('title') || null,
			commentsCount: subtext ? parseComments(subtext) : null,
		});
	}

	return stories;
};
