import { registerService } from '@webext-core/proxy-service';
import { defineBackground } from 'wxt/utils/define-background';
import { createHighlightUnreadCommentsService } from '@/components/comments/highlight-unread-comments.ts';
import { createReadStoriesService } from '@/components/hide_read_stories/index.ts';
import { createFetchRemoteService } from '@/utils/dom.ts';
import {
	FETCH_REMOTE_SERVICE_KEY,
	HIGHLIGHT_UNREAD_COMMENTS_KEY,
	READ_STORIES_SERVICE_KEY,
} from '@/utils/proxy-service-keys.ts';

export default defineBackground(() => {
	registerService(READ_STORIES_SERVICE_KEY, createReadStoriesService());
	registerService(HIGHLIGHT_UNREAD_COMMENTS_KEY, createHighlightUnreadCommentsService());
	registerService(FETCH_REMOTE_SERVICE_KEY, createFetchRemoteService());
});
