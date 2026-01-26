import type { ProxyServiceKey } from '@webext-core/proxy-service';
import type { HighlightUnReadCommentsService } from '@/components/comments/highlight-unread-comments.ts';
import type { ReadStoriesService } from '@/components/story/index.ts';
import type { FetchRemoteService } from '@/utils/dom.ts';

export const READ_STORIES_SERVICE_KEY =
	'read-stories-service' as ProxyServiceKey<ReadStoriesService>;
export const HIGHLIGHT_UNREAD_COMMENTS_KEY =
	'highlight-unread-comments-service' as ProxyServiceKey<HighlightUnReadCommentsService>;
export const FETCH_REMOTE_SERVICE_KEY =
	'fetch-remote-service' as ProxyServiceKey<FetchRemoteService>;
