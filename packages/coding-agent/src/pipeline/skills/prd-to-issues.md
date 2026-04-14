---
name: prd-to-issues
tier: 3
caveman: true
input_artifacts:
  - docs/agent/prd-NNN.md
output_artifact: docs/agent/issues/
preserve_on_compaction:
  - "Issue list with blocking relationships and priorities"
---

Read the most recent `docs/agent/prd-*.md` file.

Break the PRD into independently-grabbable GitHub issues using vertical slices (tracer bullets).

## Rules for Vertical Slices

- Each issue is a thin vertical slice cutting through ALL integration layers end-to-end (schema → API → UI → tests), NOT a horizontal layer slice.
- A completed issue is independently demoable or verifiable.
- Mark each issue as HITL (requires human interaction) or AFK (can be merged without human review).
- Prefer AFK over HITL where possible.
- Prefer many thin slices over few thick ones.

## Process

1. Draft a numbered list of proposed issues. For each:
   - Title
   - Type: HITL / AFK
   - Blocked by: which other issue numbers (if any)
   - User stories covered: reference by number from PRD

2. Show the list to the user. Ask:
   - Does the granularity feel right?
   - Are dependency relationships correct?
   - Should any issues be merged or split?

3. Iterate until user approves.

4. Create GitHub issues in dependency order (blockers first) so issue numbers are correct:

```bash
gh issue create --title "<title>" --body "<body>" --label "agent"
```

Issue body template:
```
## What to build
[End-to-end behavior description. Reference PRD sections, don't duplicate.]

## Acceptance criteria
- [ ] criterion 1
- [ ] criterion 2

## Blocked by
- Blocked by #<issue-number>
(or "None — can start immediately")

## User stories addressed
- User story N from PRD
```

5. Write a local Markdown cache file for each issue at `docs/agent/issues/NNN-slug.md`:

```yaml
---
number: 1
github_issue: 42
title: Auth setup with JWT
status: backlog
blocked_by: []
priority: 1
branch: null
---
```

Create the `docs/agent/issues/` directory if it does not exist.

Type /next when all issues are created.
