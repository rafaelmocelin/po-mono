---
name: grill-me
tier: 1
caveman: false
input_artifacts: []
output_artifact: docs/agent/grill-me-decisions.md
preserve_on_compaction:
  - "Decision Tree tracker — all OPEN, RESOLVED, and DEFERRED branches"
---

Interview me relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.

Ask questions one at a time.

If a question can be answered by exploring the codebase, explore the codebase instead.

## Decision Tracker

Maintain a running Decision Tree and show it after each answer. Update it continuously:

```
Decision Tree:
  [RESOLVED] <decision>: <resolution>
  [OPEN]     <decision>
  [DEFERRED] <decision> — explicitly out of scope
```

- Mark a branch RESOLVED when you have a clear answer.
- Mark a branch DEFERRED when the user explicitly says it is out of scope.
- Add new OPEN branches as you discover them.
- The tracker is your primary artifact — keep it complete and current.

## Termination

When all branches are RESOLVED or DEFERRED:
1. Show the complete final Decision Tree.
2. Recommend completion: "All branches resolved. Type /next to proceed to write-a-prd, or continue refining."

Either party can end early with /next, but the tracker keeps both honest.

## Output Artifact

When the session ends (user types /next), write `docs/agent/grill-me-decisions.md`:

```markdown
# Grill-Me Decisions

## Resolved Decisions

- **[decision name]**: [resolution]
- **[decision name]**: [resolution]

## Deferred Items

- **[item]** — [reason it is out of scope]

## Key Constraints Identified

- [constraint]
- [constraint]
```

Create the `docs/agent/` directory if it does not exist.
