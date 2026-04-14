# Contributing to po

Thanks for wanting to contribute. This guide exists to save both of us time.

## The One Rule

**You must understand your code.** If you can't explain what your changes do and how they interact with the rest of the system, your PR will be closed.

Using AI to write code is fine. You can gain understanding by interrogating an agent with access to the codebase until you grasp all edge cases and effects of your changes. What's not fine is submitting agent-generated output without that understanding.

If you use an agent, run it from the repo root so it picks up `AGENTS.md` automatically. Your agent must follow the rules and guidelines in that file.

## First-Time Contributors

1. Open an issue describing what you want to change and why
2. Keep it concise (if it doesn't fit on one screen, it's too long)
3. Write in your own voice
4. A maintainer will comment `lgtm` if approved
5. Once approved, you can submit PRs

This exists because AI makes it trivial to generate plausible-looking but low-quality contributions. The issue step lets us filter early.

## Before Submitting a PR

```bash
npm run check   # must pass with no errors, warnings, or infos
npm test        # must pass
```

Do not edit `CHANGELOG.md`. Changelog entries are added by maintainers.

## Philosophy

po's pipeline behavior lives in `src/pipeline/` and the extension system — not in the pi core. PRs that modify pi core files without a strong reason will be rejected.

If your feature doesn't need a new slash command, a new pipeline step, or a new module, it probably doesn't need a PR.

## Questions?

Open an issue.
