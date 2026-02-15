# Contributing

Thanks for contributing to Orange Juice.

## Our Culture

- Be friendly and understanding.
- Treat people the way you want to be treated.
- No judging or making fun of people.
- Be helpful and supportive.
- No question is stupid.

## AI Contributions

AI-assisted and AI-generated contributions are welcome.

Conditions:

- Every code change must be reviewed and approved by a human.
- Unit tests must be comprehensive. AI can help write them, but tests still require human review.
- Code must be clean, well-structured, and maintainable.
- Documentation updates are required with meaningful changes:
  - Update `README.md` when project behavior, setup, or usage changes.
  - Update website/docs features when user-facing functionality changes.

## Issues, Discussions, and PR Flow

- Non-issues found in Issues will be moved to Discussions.
- We keep issues minimal and mostly feature-oriented.
- Bugs get priority.
- We aim to review and accept PRs quickly.
- We release early and release often.

## Commit Title Format (Required)

Commit titles must follow the convention used by `.github/workflows/release.yml`.

Recommended format:

- `<type>(<scope>)?: <summary>`

Examples:

- `feat: add keyboard shortcut for reply`
- `fix(comment): handle empty thread root`
- `docs: update installation section`
- `refactor(story): simplify selection state`

Supported release-relevant types in this repository:

- `feat` or `feature` -> treated as a feature
- `fix` -> treated as a bug fix
- `chore`, `docs`, `style`, `refactor`, `perf`, `test` -> treated as maintenance

Breaking changes:

- Use `!` in the type section (for example: `feat!: ...` or `feat(scope)!: ...`), or
- Include `BREAKING CHANGE:` in the commit message body.

How `release.yml` uses your commit titles:

- If any commit is marked as breaking change, the release bumps **major**.
- Else if any commit is `feat`/`feature`, the release bumps **minor**.
- Otherwise, the release bumps **patch**.

## Signed Commits (Required)

All commits must be signed.

- Configure Git commit signing locally.
- Use signed commits for every PR commit.
- If you are not sure how to set this up, inspect recent commits in this repository and follow GitHub's signing documentation.

GitHub docs:

- About commit signature verification: https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification
- Generating a new GPG key: https://docs.github.com/en/authentication/managing-commit-signature-verification/generating-a-new-gpg-key
- Telling Git about your signing key: https://docs.github.com/en/authentication/managing-commit-signature-verification/telling-git-about-your-signing-key
- Signing commits: https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-commits

## Before You Open a PR

- Ensure that tests and code linting checks pass.
- Ensure a human reviews changes.
- Ensure tests are comprehensive and reviewed.
- Ensure docs are updated (`README.md` and relevant website/docs).
- Ensure commit titles match the required format.
- Ensure all commits are signed.

Thank you, and we look forward to your contributions.

hello@oj-hn.com