import { registerService } from '@webext-core/proxy-service';
import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { handleExpireComments } from '@/components/comments/highlight-unread-comments.ts';
import { createReadStoriesService } from '@/components/hide_read_stories/index.ts';
import { READ_STORIES_SERVICE_KEY } from '@/utils/proxy-service-keys.ts';

export default defineBackground(() => {
	registerService(READ_STORIES_SERVICE_KEY, createReadStoriesService());
	browser.runtime.onMessage.addListener(handleExpireComments);
});
