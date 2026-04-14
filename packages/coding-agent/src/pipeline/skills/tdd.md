---
name: tdd
tier: 2
caveman: true
input_artifacts:
  - docs/agent/issues/NNN-slug.md
  - docs/agent/prd-NNN.md
output_artifact: code + tests on feature branch
preserve_on_compaction:
  - "Test plan — all behaviors to test and their status (not started / red / green)"
  - "Current vertical slice being worked on"
  - "Remaining slices list"
  - "Current test file content"
---

Read the current issue file from `docs/agent/issues/` and the PRD test strategy section.

See [tests.md](references/tests.md), [mocking.md](references/mocking.md), [deep-modules.md](references/deep-modules.md), [refactoring.md](references/refactoring.md) for guidance.

## Issue Pickup

1. Read the issue file. Check `blocked_by` — do not start a blocked issue.
2. Read the PRD test strategy section for this feature.

## Per-Issue Flow

### 1. Plan (before writing any code)

- [ ] Confirm interface changes needed with the user
- [ ] Confirm which behaviors to test (prioritize)
- [ ] Identify deep module opportunities (small interface, large hidden implementation)
- [ ] List all behaviors to test as vertical slices
- [ ] Get user approval on the plan

Create branch:
```bash
git checkout -b agent/issue-NNN-slug
```

### 2. Tracer bullet (first slice)

Write ONE test that confirms ONE end-to-end path:
- RED: write test → run → confirm it fails for the right reason
- GREEN: write minimal code → run → confirm it passes
- Commit: `git commit -m "[issue-NNN] <behavior description>"`

### 3. Incremental loop

For each remaining slice:
- RED → GREEN → commit

Rules:
- One test at a time
- Only enough code to pass current test
- Do not anticipate future tests
- Tests test behavior through public interface ONLY — never internal details

### 4. Refactor

After all slices pass:
- Extract duplication
- Deepen modules where appropriate
- Run tests after each refactor step
- Commit: `git commit -m "[issue-NNN] refactor: <description>"`

### 5. Complete

Update issue status:
```bash
gh issue close <github_issue_number>
```

Update local cache file: set `status: done`, `branch: agent/issue-NNN-slug`.

Pause for user review before picking up next issue.

## Escalation Protocol

If you cannot make a test pass after 3 RED→GREEN attempts on a single slice:
- Output exactly: `ESCALATE: <slice description>`
- Wait for the orchestrator to provide guidance before continuing.

## Anti-Pattern: Horizontal Slicing

DO NOT write all tests first, then all implementation. This produces brittle tests.

WRONG:
```
RED:   test1, test2, test3, test4
GREEN: impl1, impl2, impl3, impl4
```

RIGHT:
```
RED→GREEN: test1→impl1→commit
RED→GREEN: test2→impl2→commit
```
