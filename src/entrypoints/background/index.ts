import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { handleHideReadStories } from '@/components/hide_read_stories/index.ts';

export default defineBackground(() => {
	browser.runtime.onMessage.addListener(handleHideReadStories);
});
