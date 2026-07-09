import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActivityTrail } from '@/utils/activity-trail';
import { ActivityId } from '@/utils/activity-trail';
import { dom } from '@/utils/dom';
import type { ActivityButtonConfig } from './activity-buttons';
import { idExtractors, initActivityButtons } from './activity-buttons';

vi.mock('@/utils/dom', () => ({
	dom: {
		findLinkByPathnameAndQueryParam: (
			root: ParentNode,
			selector: string,
			pathname: string,
			param: string,
			value?: string,
			baseUrl = window.location.origin
		) => {
			const candidates = root.querySelectorAll<HTMLAnchorElement>(selector);
			for (const candidate of candidates) {
				const href = candidate.getAttribute('href');
				if (!href) {
					continue;
				}
				const url = new URL(href, baseUrl);
				if (url.pathname !== pathname) {
					continue;
				}
				const paramValue = url.searchParams.get(param);
				if (paramValue && (value === undefined || paramValue === value)) {
					return candidate;
				}
			}
		},
		getAuthToken: vi.fn(),
		getHrefQueryParam: (href: string, param: string, baseUrl = window.location.origin) => {
			const url = new URL(href, baseUrl);
			return url.searchParams.get(param) ?? undefined;
		},
		toggleActivityState: vi.fn(),
	},
}));

const createDeferred = <T>() => {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((promiseResolve) => {
		resolve = promiseResolve;
	});
	return { promise, resolve };
};

describe('activity-buttons', () => {
	let doc: Document;
	let mockActivityTrail: {
		get: ReturnType<typeof vi.fn>;
		set: ReturnType<typeof vi.fn>;
		remove: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		doc = document.implementation.createHTMLDocument();
		mockActivityTrail = {
			get: vi.fn().mockResolvedValue(undefined),
			remove: vi.fn().mockResolvedValue(true),
			set: vi.fn().mockResolvedValue(undefined),
		};
		vi.clearAllMocks();
	});

	describe('idExtractors', () => {
		describe('default extractor', () => {
			it('should extract id from element with unv_ prefix', () => {
				const nav = doc.createElement('div');
				const unvElement = doc.createElement('span');
				unvElement.id = 'unv_12345';
				nav.appendChild(unvElement);

				const extractor = idExtractors.get('default');
				if (!extractor) {
					throw new Error('missing');
				}
				const result = extractor(nav);

				expect(result.element).toBe(unvElement);
				expect(result.id).toBe('12345');
			});

			it('should return null element and undefined id when no unv_ element exists', () => {
				const nav = doc.createElement('div');

				const extractor = idExtractors.get('default');
				if (!extractor) {
					throw new Error('missing');
				}
				const result = extractor(nav);

				expect(result.element).toBeNull();
				expect(result.id).toBeUndefined();
			});
		});

		describe('/jobs extractor', () => {
			it('should extract id from item link href', () => {
				const nav = doc.createElement('div');
				const link = doc.createElement('a');
				link.href = 'https://example.com/item?id=67890';
				nav.appendChild(link);

				const extractor = idExtractors.get('/jobs');
				if (!extractor) {
					throw new Error('missing');
				}
				const result = extractor(nav);

				expect(result.element).toBe(link);
				expect(result.id).toBe('67890');
			});

			it('should extract id with ampersand in href', () => {
				const nav = doc.createElement('div');
				const link = doc.createElement('a');
				link.href = 'item?id=11111&foo=bar';
				nav.appendChild(link);

				const extractor = idExtractors.get('/jobs');
				if (!extractor) {
					throw new Error('missing');
				}
				const result = extractor(nav);

				expect(result.element).toBe(link);
				expect(result.id).toBe('11111');
			});

			it('should extract id when the item id param is not first', () => {
				const nav = doc.createElement('div');
				const link = doc.createElement('a');
				link.href = 'item?foo=bar&id=22222';
				nav.appendChild(link);

				const extractor = idExtractors.get('/jobs');
				if (!extractor) {
					throw new Error('missing');
				}
				const result = extractor(nav);

				expect(result.element).toBe(link);
				expect(result.id).toBe('22222');
			});

			it('should return null when no item link exists', () => {
				const nav = doc.createElement('div');

				const extractor = idExtractors.get('/jobs');
				if (!extractor) {
					throw new Error('missing');
				}
				const result = extractor(nav);

				expect(result.element).toBeNull();
				expect(result.id).toBeUndefined();
			});
		});
	});

	describe('initActivityButtons', () => {
		const createSubline = (id: string) => {
			const subline = doc.createElement('span');
			subline.classList.add('subline');
			const unv = doc.createElement('span');
			unv.id = `unv_${id}`;
			subline.appendChild(unv);
			doc.body.appendChild(subline);
			return subline;
		};

		const createComhead = (id: string) => {
			const comhead = doc.createElement('span');
			comhead.classList.add('comhead');
			const unv = doc.createElement('span');
			unv.id = `unv_${id}`;
			comhead.appendChild(unv);
			doc.body.appendChild(comhead);
			return comhead;
		};

		const createSubtext = (id: string) => {
			const subtext = doc.createElement('span');
			subtext.classList.add('subtext');
			const unv = doc.createElement('span');
			unv.id = `unv_${id}`;
			subtext.appendChild(unv);
			doc.body.appendChild(subtext);
			return subtext;
		};

		const favoriteConfig: ActivityButtonConfig = {
			buttonClass: 'oj_favorite_link',
			buttonLabels: { active: 'unfavorite', inactive: 'favorite' },
			componentType: 'favorite',
		};

		const flagConfig: ActivityButtonConfig = {
			buttonClass: 'oj_flag_link',
			buttonLabels: { active: 'unflag', inactive: 'flag' },
			componentType: 'flag',
		};

		it('should create favorite button for submission in subline', async () => {
			createSubline('12345');

			await initActivityButtons(
				doc,
				'/',
				mockActivityTrail as unknown as ActivityTrail,
				favoriteConfig
			);

			const button = doc.querySelector('.oj_favorite_link');
			expect(button).toBeTruthy();
			expect(button?.textContent).toBe('favorite');
			expect(button?.classList.contains('oj_link_button')).toBe(true);
		});

		it('should create flag button for comment in comhead', async () => {
			createComhead('67890');

			await initActivityButtons(
				doc,
				'/',
				mockActivityTrail as unknown as ActivityTrail,
				flagConfig
			);

			const button = doc.querySelector('.oj_flag_link');
			expect(button).toBeTruthy();
			expect(button?.textContent).toBe('flag');
		});

		it('should show active state when item is already favorited', async () => {
			createSubline('12345');
			mockActivityTrail.get.mockResolvedValueOnce({
				auth: 'auth123',
				exp: Date.now() + 1_000_000,
				id: '12345',
				type: ActivityId.FavoriteSubmissions,
			});

			await initActivityButtons(
				doc,
				'/',
				mockActivityTrail as unknown as ActivityTrail,
				favoriteConfig
			);

			const button = doc.querySelector('.oj_favorite_link');
			expect(button?.textContent).toBe('unfavorite');
		});

		it('should add separator after button', async () => {
			const subline = createSubline('12345');

			await initActivityButtons(
				doc,
				'/',
				mockActivityTrail as unknown as ActivityTrail,
				favoriteConfig
			);

			const separator = subline.querySelector('span:not([id])');
			expect(separator?.textContent).toBe(' | ');
		});

		it('should not add button if already exists by class', async () => {
			const subline = createSubline('12345');
			const existingButton = doc.createElement('button');
			existingButton.classList.add('oj_favorite_link');
			subline.appendChild(existingButton);

			await initActivityButtons(
				doc,
				'/',
				mockActivityTrail as unknown as ActivityTrail,
				favoriteConfig
			);

			const buttons = doc.querySelectorAll('.oj_favorite_link');
			expect(buttons.length).toBe(1);
		});

		it('should not add button if already exists by label text', async () => {
			const subline = createSubline('12345');
			const existingLink = doc.createElement('a');
			existingLink.textContent = 'favorite';
			subline.appendChild(existingLink);

			await initActivityButtons(
				doc,
				'/',
				mockActivityTrail as unknown as ActivityTrail,
				favoriteConfig
			);

			const buttons = doc.querySelectorAll('.oj_favorite_link');
			expect(buttons.length).toBe(0);
		});

		it('should not add flag button when comment already has an unflag link without a hyphen', async () => {
			const comhead = createComhead('12345');
			const existingLink = doc.createElement('a');
			existingLink.textContent = 'unflag';
			comhead.appendChild(existingLink);

			await initActivityButtons(
				doc,
				'/',
				mockActivityTrail as unknown as ActivityTrail,
				flagConfig
			);

			const buttons = doc.querySelectorAll('.oj_flag_link');
			expect(buttons.length).toBe(0);
		});

		it('should skip nav without id element', async () => {
			const subline = doc.createElement('span');
			subline.classList.add('subline');
			doc.body.appendChild(subline);

			await initActivityButtons(
				doc,
				'/',
				mockActivityTrail as unknown as ActivityTrail,
				favoriteConfig
			);

			const button = doc.querySelector('.oj_favorite_link');
			expect(button).toBeNull();
		});

		it('should handle multiple navs', async () => {
			createSubline('11111');
			createSubline('22222');
			createComhead('33333');

			await initActivityButtons(
				doc,
				'/',
				mockActivityTrail as unknown as ActivityTrail,
				favoriteConfig
			);

			const buttons = doc.querySelectorAll('.oj_favorite_link');
			expect(buttons.length).toBe(3); // 2 sublines + 1 comhead all get favorite buttons
		});

		it('should keep each button state attached to the correct nav when activity lookups resolve out of order', async () => {
			const firstSubline = createSubline('11111');
			const secondSubline = createSubline('22222');
			const firstLookup = createDeferred<undefined>();
			const secondLookup = createDeferred<{
				auth: string;
				exp: number;
				id: string;
				type: ActivityType;
			}>();
			mockActivityTrail.get
				.mockReturnValueOnce(firstLookup.promise)
				.mockReturnValueOnce(secondLookup.promise);

			const initPromise = initActivityButtons(
				doc,
				'/',
				mockActivityTrail as unknown as ActivityTrail,
				favoriteConfig
			);
			secondLookup.resolve({
				auth: 'auth222',
				exp: Date.now() + 1_000_000,
				id: '22222',
				type: ActivityId.FavoriteSubmissions,
			});
			firstLookup.resolve(undefined);
			await initPromise;

			expect(firstSubline.querySelector('.oj_favorite_link')?.textContent).toBe('favorite');
			expect(secondSubline.querySelector('.oj_favorite_link')?.textContent).toBe(
				'unfavorite'
			);
		});

		describe('button click behavior', () => {
			it('should toggle inactive to active on click', async () => {
				createSubline('12345');
				vi.mocked(dom.getAuthToken).mockResolvedValueOnce('auth123');
				vi.mocked(dom.toggleActivityState).mockResolvedValueOnce(true);

				await initActivityButtons(
					doc,
					'/',
					mockActivityTrail as unknown as ActivityTrail,
					favoriteConfig
				);

				const button = doc.querySelector('.oj_favorite_link') as HTMLButtonElement;
				expect(button.textContent).toBe('favorite');

				button.click();
				await vi.waitFor(() => {
					expect(mockActivityTrail.set).toHaveBeenCalledWith({
						auth: 'auth123',
						exp: expect.any(Number),
						id: '12345',
						type: ActivityId.FavoriteSubmissions,
					});
				});

				expect(button.textContent).toBe('unfavorite');
			});

			it('should toggle active to inactive on click', async () => {
				createSubline('12345');
				mockActivityTrail.get.mockResolvedValue({
					auth: 'auth123',
					exp: Date.now() + 1_000_000,
					id: '12345',
					type: ActivityId.FavoriteSubmissions,
				});
				vi.mocked(dom.toggleActivityState).mockResolvedValueOnce(true);

				await initActivityButtons(
					doc,
					'/',
					mockActivityTrail as unknown as ActivityTrail,
					favoriteConfig
				);

				const button = doc.querySelector('.oj_favorite_link') as HTMLButtonElement;
				expect(button.textContent).toBe('unfavorite');

				button.click();
				await vi.waitFor(() => {
					expect(mockActivityTrail.remove).toHaveBeenCalled();
				});

				expect(button.textContent).toBe('favorite');
			});

			it('should disable button during click', async () => {
				createSubline('12345');
				let resolveToggle: (value: boolean) => void;
				const togglePromise = new Promise<boolean>((resolve) => {
					resolveToggle = resolve;
				});
				vi.mocked(dom.getAuthToken).mockResolvedValueOnce('auth123');
				vi.mocked(dom.toggleActivityState).mockReturnValueOnce(togglePromise);

				await initActivityButtons(
					doc,
					'/',
					mockActivityTrail as unknown as ActivityTrail,
					favoriteConfig
				);

				const button = doc.querySelector('.oj_favorite_link') as HTMLButtonElement;
				button.click();

				await vi.waitFor(() => {
					expect(button.disabled).toBe(true);
				});

				// @ts-expect-error
				resolveToggle(true);
				await vi.waitFor(() => {
					expect(button.disabled).toBe(false);
				});
			});

			it('should not update trail if toggle fails', async () => {
				createSubline('12345');
				vi.mocked(dom.getAuthToken).mockResolvedValueOnce('auth123');
				vi.mocked(dom.toggleActivityState).mockResolvedValueOnce(false);

				await initActivityButtons(
					doc,
					'/',
					mockActivityTrail as unknown as ActivityTrail,
					favoriteConfig
				);

				const button = doc.querySelector('.oj_favorite_link') as HTMLButtonElement;
				button.click();

				await vi.waitFor(() => {
					expect(dom.toggleActivityState).toHaveBeenCalled();
				});

				expect(mockActivityTrail.set).not.toHaveBeenCalled();
				expect(button.textContent).toBe('favorite');
			});

			it('should not proceed if no auth token is available', async () => {
				createSubline('12345');
				vi.mocked(dom.getAuthToken).mockResolvedValueOnce(undefined);

				await initActivityButtons(
					doc,
					'/',
					mockActivityTrail as unknown as ActivityTrail,
					favoriteConfig
				);

				const button = doc.querySelector('.oj_favorite_link') as HTMLButtonElement;
				button.click();

				await vi.waitFor(() => {
					expect(dom.getAuthToken).toHaveBeenCalled();
				});

				expect(dom.toggleActivityState).not.toHaveBeenCalled();
				expect(mockActivityTrail.set).not.toHaveBeenCalled();
			});

			it('should use existing auth from activity detail', async () => {
				createSubline('12345');
				mockActivityTrail.get.mockResolvedValue({
					auth: 'existing_auth',
					exp: Date.now() + 1_000_000,
					id: '12345',
					type: ActivityId.FavoriteSubmissions,
				});
				vi.mocked(dom.toggleActivityState).mockResolvedValueOnce(true);

				await initActivityButtons(
					doc,
					'/',
					mockActivityTrail as unknown as ActivityTrail,
					favoriteConfig
				);

				const button = doc.querySelector('.oj_favorite_link') as HTMLButtonElement;
				button.click();

				await vi.waitFor(() => {
					expect(dom.toggleActivityState).toHaveBeenCalledWith(
						'12345',
						true,
						'existing_auth',
						ActivityId.FavoriteSubmissions
					);
				});

				expect(dom.getAuthToken).not.toHaveBeenCalled();
			});

			it('should stop propagation and prevent default on click', async () => {
				createSubline('12345');
				vi.mocked(dom.getAuthToken).mockResolvedValueOnce('auth123');
				vi.mocked(dom.toggleActivityState).mockResolvedValueOnce(true);

				await initActivityButtons(
					doc,
					'/',
					mockActivityTrail as unknown as ActivityTrail,
					favoriteConfig
				);

				const button = doc.querySelector('.oj_favorite_link') as HTMLButtonElement;
				const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
				const stopPropagationSpy = vi.spyOn(clickEvent, 'stopPropagation');
				const preventDefaultSpy = vi.spyOn(clickEvent, 'preventDefault');

				button.dispatchEvent(clickEvent);

				expect(stopPropagationSpy).toHaveBeenCalled();
				expect(preventDefaultSpy).toHaveBeenCalled();
			});

			it('should handle errors gracefully', async () => {
				const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
				createSubline('12345');
				vi.mocked(dom.getAuthToken).mockRejectedValueOnce(new Error('Network error'));

				await initActivityButtons(
					doc,
					'/',
					mockActivityTrail as unknown as ActivityTrail,
					favoriteConfig
				);

				const button = doc.querySelector('.oj_favorite_link') as HTMLButtonElement;
				button.click();

				await vi.waitFor(() => {
					expect(consoleErrorSpy).toHaveBeenCalledWith({
						config: favoriteConfig,
						error: expect.any(Error),
						pathname: '/',
					});
				});

				expect(button.disabled).toBe(false);
				consoleErrorSpy.mockRestore();
			});
		});

		describe('cleanup', () => {
			it('should remove buttons and separators on cleanup', async () => {
				createSubline('12345');

				const cleanup = await initActivityButtons(
					doc,
					'/',
					mockActivityTrail as unknown as ActivityTrail,
					favoriteConfig
				);

				expect(doc.querySelector('.oj_favorite_link')).toBeTruthy();

				cleanup();

				expect(doc.querySelector('.oj_favorite_link')).toBeNull();
			});

			it('should remove event listeners on cleanup', async () => {
				createSubline('12345');
				vi.mocked(dom.getAuthToken).mockResolvedValue('auth123');
				vi.mocked(dom.toggleActivityState).mockResolvedValue(true);

				const cleanup = await initActivityButtons(
					doc,
					'/',
					mockActivityTrail as unknown as ActivityTrail,
					favoriteConfig
				);

				const button = doc.querySelector('.oj_favorite_link') as HTMLButtonElement;
				cleanup();

				// Click should not trigger anything after cleanup
				button.click();
				await new Promise((resolve) => setTimeout(resolve, 10));

				expect(dom.getAuthToken).not.toHaveBeenCalled();
			});
		});

		describe('activity type mapping', () => {
			const tests = [
				{
					config: favoriteConfig,
					createNav: createSubline,
					expectedType: ActivityId.FavoriteSubmissions,
					name: 'favorite in subline',
				},
				{
					config: favoriteConfig,
					createNav: createComhead,
					expectedType: ActivityId.FavoriteComments,
					name: 'favorite in comhead',
				},
				{
					config: favoriteConfig,
					createNav: createSubtext,
					expectedType: ActivityId.FavoriteSubmissions,
					name: 'favorite in subtext',
				},
				{
					config: flagConfig,
					createNav: createSubline,
					expectedType: ActivityId.FlagsSubmissions,
					name: 'flag in subline',
				},
				{
					config: flagConfig,
					createNav: createComhead,
					expectedType: ActivityId.FlagsComments,
					name: 'flag in comhead',
				},
				{
					config: flagConfig,
					createNav: createSubtext,
					expectedType: ActivityId.FlagsSubmissions,
					name: 'flag in subtext',
				},
			];

			for (const { name, createNav, config, expectedType } of tests) {
				it(`should use correct activity type for ${name}`, async () => {
					createNav('12345');

					await initActivityButtons(
						doc,
						'/',
						mockActivityTrail as unknown as ActivityTrail,
						config
					);

					expect(mockActivityTrail.get).toHaveBeenCalledWith({
						id: '12345',
						type: expectedType,
					});
				});
			}
		});
	});
});
