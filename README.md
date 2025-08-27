# Orange Juice is an extension to make HackerNews sweeter.

I've been part of the HN community since 2009, and over the years I've collected plenty of ideas for improving the experience. I've used HNES, Refined Hacker News, other extensions, and saved countless interesting ideas along the way. Many of those projects were promising but ended up abandoned. That may happen here too, but this is something I've wanted to explore on my own for a long time. With AI now making experimentation easier, I feel like this is the right moment to finally execute on those ideas.

One important lesson: the goal isn't to redesign Hacker News. Its minimal UX works, and nobody wants to relearn an interface that already does the job. Instead, the plan is to make small, thoughtful tweaks; adding features, polishing the UI; just enough to make HN a bit more pleasant to use without changing its essence.

I'm also very interested in exploring more social features. To me, HN is already a giant social network, but it feels disconnected inside the app. There are opportunities to build tools that make interactions richer. The extension should offer features valuable enough that people want it for what they can't get elsewhere, not through obvious things like live chat (which is ripe for abuse), but through more creative, viral ideas I'll be experimenting with. A big part of doing this extension open source is to ensure that people can trust it. The last thing I want is for it to become a source of pain.

I'm not a browser extension expert. The code will start out messy, but with experimentation and feedback, it will improve. A big part of this is just learning to work within our extension framework (wxt), while also committing to writing solid unit and end-to-end tests so the extension becomes something reliable people can depend on over time.

The ultimate goal: make the extension useful enough that it runs smoothly across all major browsers.

# Running E2E tests

Make sure to run `bunx playwright install` before running test.
