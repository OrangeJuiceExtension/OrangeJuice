import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type Browser, browser } from '#imports';
import {
	ReadStoriesService,
	type ReadStoryLookup,
	type ReadStoryVisit,
} from '@/services/read-stories-service.ts';

const createVisit = (overrides: Partial<Browser.history.VisitItem>): Browser.history.VisitItem => ({
	id: 'history-id',
	visitId: 'visit-id',
	referringVisitId: 'ref-visit-id',
	visitTime: 0,
	transition: 'link',
	isLocal: false,
	...overrides,
});

describe('ReadStoriesService', () => {
	let service: ReadStoriesService;
	let getVisitsSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.clearAllMocks();
		service = new ReadStoriesService();
		getVisitsSpy = vi.spyOn(browser.history, 'getVisits');
	});

	describe('getVisits', () => {
		it('returns visit results for serializable story lookups', async () => {
			const stories: ReadStoryLookup[] = [
				{ id: '1', url: 'https://example.com/1' },
				{ id: '2', url: 'https://example.com/2' },
			];
			const visited: Browser.history.VisitItem[] = [createVisit({ visitTime: 1000 })];
			const expected: ReadStoryVisit[] = [
				{ id: '1', latestVisit: createVisit({ visitTime: 1000 }) },
				{ id: '2' },
			];

			getVisitsSpy.mockResolvedValueOnce(visited);
			getVisitsSpy.mockResolvedValueOnce([]);

			const result = await service.getVisits(stories);

			expect(result).toEqual(expected);
			expect(getVisitsSpy).toHaveBeenCalledTimes(2);
			expect(getVisitsSpy).toHaveBeenCalledWith({ url: 'https://example.com/1' });
			expect(getVisitsSpy).toHaveBeenCalledWith({ url: 'https://example.com/2' });
		});

		it('skips history lookups for stories without urls', async () => {
			const stories: ReadStoryLookup[] = [{ id: '1' }, { id: '2', url: '' }];
			const expected: ReadStoryVisit[] = [{ id: '1' }, { id: '2' }];

			const result = await service.getVisits(stories);

			expect(result).toEqual(expected);
			expect(getVisitsSpy).not.toHaveBeenCalled();
		});

		it('returns partial results when individual history lookups fail', async () => {
			const stories: ReadStoryLookup[] = [
				{ id: '1', url: 'https://example.com/1' },
				{ id: '2', url: 'https://example.com/2' },
			];
			const visited: Browser.history.VisitItem[] = [
				createVisit({ visitTime: 2000, transition: 'typed' }),
			];
			const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			getVisitsSpy.mockResolvedValueOnce(visited);
			getVisitsSpy.mockRejectedValueOnce(new Error('lookup failed'));

			const result = await service.getVisits(stories);

			expect(result).toEqual([
				{ id: '1', latestVisit: createVisit({ visitTime: 2000, transition: 'typed' }) },
				{ id: '2' },
			]);
			expect(logSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					error: 'failed to getVisits',
					story: { id: '2', url: 'https://example.com/2' },
				})
			);
		});
	});
});
