import { browser } from 'wxt/browser';

import { defineBackground } from 'wxt/utils/define-background';
import { handleExpireComments } from '@/components/comments/highlight-unread-comments.ts';
import { handleHideReadStories } from '@/components/hide_read_stories/index.ts';

export default defineBackground(() => {
	browser.runtime.onMessage.addListener(handleHideReadStories);
	browser.runtime.onMessage.addListener(handleExpireComments);
});
