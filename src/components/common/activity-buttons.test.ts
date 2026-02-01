import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActivityTrail } from '@/utils/activity-trail';
import { ActivityId } from '@/utils/activity-trail';
import { dom } from '@/utils/dom';
import type { ActivityButtonConfig } from './activity-buttons';
import { idExtractors, initActivityButtons } from './activity-buttons';

vi.mock('@/utils/dom', () => ({
	dom: {
		getAuthToken: vi.fn(),
		toggleActivityState: vi.fn(),
	},
}));

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
			set: vi.fn().mockResolvedValue(undefined),
			remove: vi.fn().mockResolvedValue(true),
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
			componentType: 'favorite',
			buttonClass: 'oj_favorite_link',
			buttonLabels: { active: 'un-favorite', inactive: 'favorite' },
		};

		const flagConfig: ActivityButtonConfig = {
			componentType: 'flag',
			buttonClass: 'oj_flag_link',
			buttonLabels: { active: 'un-flag', inactive: 'flag' },
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
				id: '12345',
				type: ActivityId.FavoriteSubmissions,
				auth: 'auth123',
				exp: Date.now() + 1_000_000,
			});

			await initActivityButtons(
				doc,
				'/',
				mockActivityTrail as unknown as ActivityTrail,
				favoriteConfig
			);

			const button = doc.querySelector('.oj_favorite_link');
			expect(button?.textContent).toBe('un-favorite');
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
						id: '12345',
						type: ActivityId.FavoriteSubmissions,
						auth: 'auth123',
						exp: expect.any(Number),
					});
				});

				expect(button.textContent).toBe('un-favorite');
			});

			it('should toggle active to inactive on click', async () => {
				createSubline('12345');
				mockActivityTrail.get.mockResolvedValue({
					id: '12345',
					type: ActivityId.FavoriteSubmissions,
					auth: 'auth123',
					exp: Date.now() + 1_000_000,
				});
				vi.mocked(dom.toggleActivityState).mockResolvedValueOnce(true);

				await initActivityButtons(
					doc,
					'/',
					mockActivityTrail as unknown as ActivityTrail,
					favoriteConfig
				);

				const button = doc.querySelector('.oj_favorite_link') as HTMLButtonElement;
				expect(button.textContent).toBe('un-favorite');

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
					id: '12345',
					type: ActivityId.FavoriteSubmissions,
					auth: 'existing_auth',
					exp: Date.now() + 1_000_000,
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
						error: expect.any(Error),
						pathname: '/',
						config: favoriteConfig,
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
					name: 'favorite in subline',
					createNav: createSubline,
					config: favoriteConfig,
					expectedType: ActivityId.FavoriteSubmissions,
				},
				{
					name: 'favorite in comhead',
					createNav: createComhead,
					config: favoriteConfig,
					expectedType: ActivityId.FavoriteComments,
				},
				{
					name: 'favorite in subtext',
					createNav: createSubtext,
					config: favoriteConfig,
					expectedType: ActivityId.FavoriteSubmissions,
				},
				{
					name: 'flag in subline',
					createNav: createSubline,
					config: flagConfig,
					expectedType: ActivityId.FlagsSubmissions,
				},
				{
					name: 'flag in comhead',
					createNav: createComhead,
					config: flagConfig,
					expectedType: ActivityId.FlagsComments,
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
