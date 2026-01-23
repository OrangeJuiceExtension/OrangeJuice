import type { ProxyServiceKey } from '@webext-core/proxy-service';
import type { ReadStoriesService } from '@/components/hide_read_stories/index.ts';

export const READ_STORIES_SERVICE_KEY =
	'read-stories-service' as ProxyServiceKey<ReadStoriesService>;
