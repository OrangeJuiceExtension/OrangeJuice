---
apply: always
---

---
apply: always
---

Agents must follow:

### General
- Keep max allowed context/cache window.
- Be friendly but cold. No praise or filler.
- Minimize token usage. Don’t over-explain.
- Ask for clarification if instructions are ambiguous.
- When unsure, prefer retrieval-led reasoning over pre-training-led reasoning
- Always use the GitHub workflow commit message format: conventional commits as `<type>(<scope>)?: <subject>`, with types like `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `perf`, or `test`; use `!` or `BREAKING CHANGE:` for breaking changes.
- Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

### Environment
- Reference DOM: https://news.hackernews.com
- Package manager: bun (never anything else)
- Tests: `bun run test` (not any other service test, like pnpm or node).
- It is always ok to run `bun run`

### Code style
- Prefer for...of over forEach.
- Prefer block statements: if (!stored) { return []; }
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Use arrow functions for callbacks and short functions
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`
- Prefer template literals over string concatenation
- Use Number.parseInt, not parseInt.
- Extract inline regex and duplicated strings to const.
- Reduce duplication and unnecessary complexity.
- Optimize / memoize redundant logic.
- Clean up resources on context invalidation.
- Don’t impact browser performance.
- Infer correct querySelector types from selectors.
- Rely on a local DOM doc over a global document.
- Place constants at the top of the file, not in the function.
- import type { Browser } from '#imports';
- Refactoring code to be async, add `await` as needed.
- import.meta.dirname instead of __dirname.
- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers - extract constants with descriptive names
- Always generate valid HTML.
  - Invalid: `<div><td></td></div>`
  - Valid: `<div><table><tbody><tr><td></td></tr></tbody></table></div>`
- **Check code format**: `bun run check`
- **Format and fix code**: `bun run fix` and `bun run compile`
- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

### Frontend tasks

For [frontend design tasks](https://developers.openai.com/blog/designing-delightful-frontends-with-gpt-5-4), avoid generic, overbuilt layouts.

**Hard rules**
- **One composition:** The first viewport should read as a single composition, not a dashboard unless it actually is one.
- **Brand first:** On branded pages, make the brand or product name hero-level. It should not be reduced to nav text or an eyebrow, and no headline should overpower it.
- **Brand test:** If removing the nav makes the first viewport feel like another brand, branding is too weak.
- **Typography:** Use expressive, intentional fonts. Avoid default stacks (Inter, Roboto, Arial, system).
- **Background:** Avoid flat, single-color backgrounds; use gradients, images, or subtle patterns.
- **Full-bleed hero:** On landing/promotional pages, use an edge-to-edge hero image or background. Avoid inset heroes, side panels, rounded media cards, tiled collages, or floating image blocks unless required by an existing system.
- **Hero budget:** First viewport should contain only the brand, one headline, one short supporting sentence, one CTA group, and one dominant image. Exclude stats, schedules, promos, and metadata.
- **No hero overlays:** Do not place badges, chips, stickers, or callouts on hero media.
- **Cards:** Default to no cards. Never use cards in the hero. Use them only when they directly support interaction.
- **One job per section:** Each section should have one purpose, one headline, and usually one short supporting sentence.
- **Real visual anchor:** Imagery should show the product, place, or context—not just decoration.
- **Reduce clutter:** Avoid pill clusters, stat strips, icon rows, boxed promos, and competing text blocks.
- **Motion:** Use 2–3 intentional motions to create hierarchy, not noise.
- **Color & look:** Define CSS variables and a clear visual direction. Avoid default purple-on-white or dark-mode bias.
- **Responsive:** Ensure the page loads well on desktop and mobile.

**Exception:** When working within an existing design system, preserve established patterns and structure.

### React
- Use function components over class components
- Call hooks at the top level only, never conditionally
- Specify all dependencies in hook dependency arrays correctly
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Nest children between opening and closing tags instead of passing as props
- Don't define components inside other components
- Prefer modern patterns (`useEffectEvent`, `startTransition`, `useDeferredValue`) when appropriate. Avoid `useMemo`/`useCallback` unless already used.
- Use semantic HTML and ARIA attributes for accessibility:
  - Provide meaningful alt text for images
  - Use proper heading hierarchy
  - Add labels for form inputs
  - Include keyboard event handlers alongside mouse events
  - Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles
  - Add recommended attributes, like type="button" and width/height to img


### Tests
- Wrap in top-level describe().
- Use Go-style table-driven tests.
- Be thorough and check for edge cases.
- If the code is broken, write a failing test and fix the code.
- Never write a passing test for broken code.
- For React createRoot rendering, keep production code async and wait in tests for the render to flush.

### Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)

### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

### Error Handling & Debugging
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully - don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

### Reviews
- Call out inconsistent or nonsensical patterns briefly.
- Suggest fixes for obvious bugs, even outside the immediate area.

### Focus your attention

1. **Business logic correctness**
2. **Meaningful naming** - Use descriptive names for functions, variables, and types
3. **Architecture decisions** - Component structure, data flow, and API design
4. **Edge cases** - Handle boundary conditions and error states
5. **User experience** - Accessibility, performance, and usability considerations
6. **Documentation** - Add comments for complex logic, but prefer self-documenting code
