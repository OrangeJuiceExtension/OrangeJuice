import type { ProxyServiceKey } from '@webext-core/proxy-service';
import type { HighlightUnReadCommentsService } from '@/components/comments/highlight-unread-comments.ts';
import type { ReadStoriesService } from '@/components/hide_read_stories/index.ts';

export const READ_STORIES_SERVICE_KEY =
	'read-stories-service' as ProxyServiceKey<ReadStoriesService>;
export const HIGHLIGHT_UNREAD_COMMENTS_KEY =
	'highlight-unread-comments-service' as ProxyServiceKey<HighlightUnReadCommentsService>;
