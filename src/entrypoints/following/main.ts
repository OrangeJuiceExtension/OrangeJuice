import type { ContentScriptContext } from '#imports';
import { renderFollowingPage } from '@/components/follow/index.ts';
import { showUserInfoOnHover } from '@/components/user/show-user-info-hover.ts';
import { enableDarkMode } from '@/utils/dark-mode.ts';
import { USERNAME_STORAGE_KEY } from '@/utils/dom.ts';
import lStorage from '@/utils/local-storage.ts';
import '../router.content/global.css';

const noopContext = {
	onInvalidated: () => undefined,
} as unknown as ContentScriptContext;

const currentUsername = (await lStorage.getItem<string>(USERNAME_STORAGE_KEY)) ?? undefined;

document.title = 'Following';
await enableDarkMode();
await renderFollowingPage(noopContext, document, {
	currentUsername,
	includeNavEnhancements: true,
});
showUserInfoOnHover(noopContext, document, currentUsername);
