# Orange Juice is an extension to make HackerNews sweeter.

## Motivation

I’ve been part of the Hacker News community since 2009, and over the years I’ve accumulated many ideas for improving the experience. I’ve used HNES, Refined Hacker News, and other extensions, and saved countless ideas along the way. Many promising projects were eventually abandoned. That may happen here too, but this is something I’ve wanted to explore personally for a long time. With AI making experimentation easier, now feels like the right time to do it.

The goal isn’t to redesign Hacker News. Its minimal UX works, and no one wants to relearn an interface that already does the job. Instead, this project focuses on small, thoughtful improvements—adding features and polish that make HN more pleasant to use without changing its core.

I’m also interested in exploring social features. HN is already a massive social network, but interactions feel fragmented. There’s room for tools that make engagement richer, not through obvious features like live chat, but through more creative, viral ideas I plan to experiment with. Keeping the extension open source is critical for trust; the last thing I want is for it to become a liability.

I’m not a browser extension expert. The code will start rough, but through experimentation, feedback, and strong unit and end-to-end tests, it should mature into something reliable. A big part of this is learning the extension framework (wxt) and building toward stability.

The ultimate goal is a genuinely useful extension that runs smoothly across all major browsers.

# Features

## Inline Reply
Clicking a "reply" link now opens an inline reply form directly on the page, eliminating the need to navigate to a separate comment page. The form includes support for quoting selected text.

## Favorite Items
Add a "favorite" button to comments and stories across various pages of HN, allowing you to save items for later reference. The button updates in place without redirecting you to a new page.

## Character Count for Story Submissions
When submitting a new story, a character counter appears below the title input field showing how many characters remain until you reach the 80-character limit.

# Running E2E tests

Make sure to run `bunx playwright install` before running tests.
