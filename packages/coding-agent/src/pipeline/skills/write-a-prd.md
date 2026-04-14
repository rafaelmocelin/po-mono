---
name: write-a-prd
tier: 1
caveman: false
input_artifacts:
  - docs/agent/grill-me-decisions.md
output_artifact: docs/agent/prd-NNN.md
preserve_on_compaction:
  - "PRD draft (all sections)"
  - "Module list with deep-module analysis"
  - "Test strategy decisions"
---

Read `docs/agent/grill-me-decisions.md` first. Then produce a PRD.

## Steps

1. Read the grill-me decisions artifact.

2. Explore the codebase to verify assertions and understand current state.

3. Interview me about any gaps not covered by the decisions document.

4. Sketch the major modules needed. For each module, identify whether it is a **deep module** (small interface, large hidden implementation, testable in isolation). Check your module list with me.

5. Write the PRD using the template below. Save it to `docs/agent/prd-NNN.md` where NNN is a zero-padded sequence number (e.g., `prd-001.md`).

## PRD Template

```markdown
# PRD: [Feature Name]

## Problem Statement

[From the user's perspective — what problem does this solve?]

## Solution

[From the user's perspective — what does the solution do?]

## User Stories

A long, numbered list. Each story: "As a <role>, I want <feature>, so that <benefit>."
Cover every aspect of the feature. Aim for 15+ stories.

1. As a ..., I want ..., so that ...

## Implementation Decisions

- [decision and rationale]
- [module boundaries]
- [architectural choices]
- [schema changes]
- [API contracts]

DO NOT include specific file paths or code snippets — they go stale.

## Test Strategy

- What makes a good test for this feature (test behavior through public interface, not implementation)
- Which modules to test and at which boundaries
- Mocking strategy
- Prior art in the codebase (similar test patterns to follow)

## Out of Scope

- [explicitly excluded items]

## Notes

- [anything else]
```

Type /next when the PRD is written and saved.
