---
name: improve-codebase-architecture
tier: 1
caveman: false
input_artifacts: []
output_artifact: docs/agent/architecture-review-NNN.md
preserve_on_compaction:
  - "Findings list — all identified issues"
  - "Improvement candidates with interface designs"
---

Explore the codebase organically to find architectural friction. Surface opportunities for deepening shallow modules and improving testability.

A **deep module** (Ousterhout): small interface hiding large implementation. Deep modules are testable, AI-navigable, and let you test at the boundary.

## Process

### 1. Explore organically

Use the Explore sub-agent to navigate the codebase. Note friction:
- Where does understanding one concept require bouncing between many small files?
- Where are modules so shallow that the interface is nearly as complex as the implementation?
- Where do tightly-coupled modules create integration risk?
- Which parts are untested or hard to test?

The friction you experience IS the signal.

### 2. Present candidates

Numbered list of deepening opportunities. For each:
- Cluster: which modules/concepts
- Why they're coupled
- Test impact: what tests would be replaced by boundary tests

Ask: "Which of these would you like to explore?"

### 3. User picks a candidate

### 4. Frame the problem space

Write a user-facing explanation of constraints, dependencies, and an illustrative sketch (not a proposal — just to ground the constraints).

### 5. Design multiple interfaces

Spawn 3+ sub-agents in parallel with different design constraints (same as design-an-interface). Present and compare.

### 6. Create GitHub issue RFC

```bash
gh issue create --title "RFC: [module] deepening" --body "..."
```

Share the URL.

Trigger: /improve-architecture command only — not part of the main pipeline.
