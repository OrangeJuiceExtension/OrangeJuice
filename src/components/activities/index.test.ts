import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContentScriptContext } from '#imports';
import { activities } from '@/components/activities/index.ts';
import { initActivityButtons } from '@/components/common/activity-buttons.ts';
import { type ActivityTrail, newActivityTrail } from '@/utils/activity-trail';
import { dom } from '@/utils/dom';

vi.mock('@/components/common/activity-buttons', () => ({
	// biome-ignore lint/suspicious/noEmptyBlockStatements: tests
	initActivityButtons: vi.fn(() => Promise.resolve(() => {})),
}));

vi.mock('@/utils/activity-trail', () => ({
	newActivityTrail: vi.fn(),
	ActivityId: {
		FavoriteSubmissions: 7,
		FavoriteComments: 8,
		FlagsSubmissions: 3,
		FlagsComments: 4,
	},
}));

vi.mock('@/utils/dom', () => ({
	dom: {
		getUsername: vi.fn(),
	},
}));

describe('activities component', () => {
	let mockCtx: ContentScriptContext;
	let cleanupFunctions: Array<() => void>;
	let mockActivityTrail: {
		addListener: ReturnType<typeof vi.fn>;
		removeListener: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		document.body.innerHTML = '';
		cleanupFunctions = [];

		mockCtx = {
			onInvalidated: vi.fn((callback: () => void) => {
				cleanupFunctions.push(callback);
			}),
		} as unknown as ContentScriptContext;

		mockActivityTrail = {
			addListener: vi.fn(),
			removeListener: vi.fn(),
		};

		vi.mocked(newActivityTrail).mockReturnValue(mockActivityTrail as unknown as ActivityTrail);

		vi.clearAllMocks();
	});

	describe('metadata', () => {
		it('should have correct id', () => {
			expect(activities.id).toBe('activities');
		});

		it('should require login', () => {
			expect(activities.loginRequired).toBe(true);
		});

		it('should match all paths', () => {
			expect(activities.matches).toEqual(['https://news.ycombinator.com/*']);
		});

		it('should run at document_end', () => {
			expect(activities.runAt).toBe('document_end');
		});
	});

	describe('main', () => {
		it('should return early if no username is found', async () => {
			vi.mocked(dom.getUsername).mockReturnValue(undefined);

			const result = await activities.main(mockCtx);

			expect(result).toBeUndefined();
			expect(newActivityTrail).not.toHaveBeenCalled();
		});

		it('should create activity trail when username exists', async () => {
			vi.mocked(dom.getUsername).mockReturnValue('testuser');

			await activities.main(mockCtx);

			expect(newActivityTrail).toHaveBeenCalledTimes(1);
		});

		it('should initialize favorite and flag buttons', async () => {
			vi.mocked(dom.getUsername).mockReturnValue('testuser');

			await activities.main(mockCtx);

			expect(initActivityButtons).toHaveBeenCalledTimes(2);

			// Check favorite button config
			expect(initActivityButtons).toHaveBeenCalledWith(
				document,
				window.location.pathname,
				mockActivityTrail,
				{
					componentType: 'favorite',
					buttonClass: 'oj_favorite_link',
					buttonLabels: { active: 'un-favorite', inactive: 'favorite' },
				}
			);

			// Check flag button config
			expect(initActivityButtons).toHaveBeenCalledWith(
				document,
				window.location.pathname,
				mockActivityTrail,
				{
					componentType: 'flag',
					buttonClass: 'oj_flag_link',
					buttonLabels: { active: 'un-flag', inactive: 'flag' },
				}
			);
		});

		it('should add activity trail listeners', async () => {
			vi.mocked(dom.getUsername).mockReturnValue('testuser');

			await activities.main(mockCtx);

			expect(mockActivityTrail.addListener).toHaveBeenCalledTimes(2);
		});

		it('should cleanup buttons when activity trail updates', async () => {
			vi.mocked(dom.getUsername).mockReturnValue('testuser');

			const mockCleanup1 = vi.fn();
			const mockCleanup2 = vi.fn();
			let callCount = 0;

			vi.mocked(initActivityButtons).mockImplementation(() => {
				callCount++;
				return Promise.resolve(callCount === 1 ? mockCleanup1 : mockCleanup2);
			});

			await activities.main(mockCtx);

			// Get the activity trail listeners that were added
			const favoriteListener = mockActivityTrail.addListener.mock.calls[0][0];
			const flagListener = mockActivityTrail.addListener.mock.calls[1][0];

			// Reset call counts
			vi.mocked(initActivityButtons).mockClear();

			// Trigger listeners (simulating activity trail update)
			await favoriteListener();
			await flagListener();

			// Should re-initialize buttons
			expect(initActivityButtons).toHaveBeenCalledTimes(2);

			// Trigger again to ensure cleanup is called
			await favoriteListener();
			await flagListener();

			// Previous cleanup functions should be called
			expect(mockCleanup1).toHaveBeenCalled();
			expect(mockCleanup2).toHaveBeenCalled();
		});

		it('should cleanup on context invalidation', async () => {
			vi.mocked(dom.getUsername).mockReturnValue('testuser');

			const mockCleanupFavorite = vi.fn();
			const mockCleanupFlag = vi.fn();
			let callCount = 0;

			vi.mocked(initActivityButtons).mockImplementation(() => {
				callCount++;
				return Promise.resolve(callCount === 1 ? mockCleanupFavorite : mockCleanupFlag);
			});

			await activities.main(mockCtx);

			expect(mockCtx.onInvalidated).toHaveBeenCalled();

			// Trigger invalidation
			for (const cleanup of cleanupFunctions) {
				cleanup();
			}

			// Should remove listeners
			expect(mockActivityTrail.removeListener).toHaveBeenCalledTimes(2);

			// Should call cleanup functions
			expect(mockCleanupFavorite).toHaveBeenCalled();
			expect(mockCleanupFlag).toHaveBeenCalled();
		});
	});
});
