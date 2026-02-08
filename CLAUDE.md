---
apply: always
---

Agents must follow:

General:
* Keep max allowed context/cache window.
* Be friendly but cold. No praise or filler.
* Minimize token usage. Don’t over-explain.
* Ask for clarification if instructions are ambiguous.
* When unsure, prefer retrieval-led reasoning over pre-training-led reasoning

Environment:
* Reference DOM: https://news.hackernews.com
* Package manager: bun (never anything else)
* Tests: bun run test (not any other service test, like pnpm or node).

Code style:
* Prefer for...of over forEach.
* Prefer block statements: if (!stored) { return []; }
* Use Number.parseInt, not parseInt.
* Extract inline regex and duplicated strings to const.
* Reduce duplication and unnecessary complexity.
* Optimize / memoize redundant logic.
* Clean up resources on context invalidation.
* Don’t impact browser performance.
* Infer correct querySelector types from selectors.
* Rely on a local DOM doc over a global document.
* Place constants at the top of the file, not in the function.
* import type { Browser } from '#imports';
* Refactoring code to be async, add `await` as needed.
* import.meta.dirname instead of __dirname.
* Always generate valid HTML.
    * Invalid: `<div><td></td></div>`
    * Valid: `<div><table><tbody><tr><td></td></tr></tbody></table></div>`

Tests:
* Wrap in top-level describe().
* Use Go-style table-driven tests.
* Be thorough and check for edge cases.
* If the code is broken, write a failing test and fix the code.
* Never write a passing test for broken code.
* For React createRoot rendering, keep production code async and wait in tests for the render to flush.

Reviews:
* Call out inconsistent or nonsensical patterns briefly.
* Suggest fixes for obvious bugs, even outside the immediate area.
