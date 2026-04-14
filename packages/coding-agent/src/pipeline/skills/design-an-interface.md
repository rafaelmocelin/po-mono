---
name: design-an-interface
tier: 1
caveman: false
input_artifacts:
  - docs/agent/prd-NNN.md
output_artifact: docs/agent/interface-designs-NNN.md
preserve_on_compaction:
  - "Interface candidates — all designs with signatures and trade-offs"
  - "Comparison matrix"
---

Based on "Design It Twice" (Ousterhout): your first design is rarely the best. Generate 3+ radically different designs, then compare.

Read `docs/agent/prd-NNN.md` (most recent). Focus on the modules identified in Implementation Decisions.

## Process

### 1. Gather requirements for each module

- What problem does it solve?
- Who are the callers?
- Key operations?
- What should be hidden inside vs exposed?

### 2. Generate 3+ designs in parallel

Use the Agent tool to spawn sub-agents simultaneously. Each sub-agent gets a different design constraint:
- Agent 1: "Minimize method count — aim for 1-3 entry points max"
- Agent 2: "Maximize flexibility — support many use cases and extension"
- Agent 3: "Optimize for the most common caller — make the default case trivial"

Each sub-agent outputs:
1. Interface signature (types, methods, params)
2. Usage example
3. What complexity it hides internally
4. Trade-offs

### 3. Present designs sequentially

Show each design fully before comparison.

### 4. Compare

Compare in prose on:
- Interface simplicity (fewer methods = easier to learn)
- Generality vs specialization
- Implementation efficiency (does shape allow efficient internals?)
- Depth (small interface, large implementation = good)
- Ease of correct use

### 5. Synthesize

Ask: "Which design best fits your primary use case? Any elements from others worth incorporating?"

### 6. Write artifact

Save the selected design + comparison to `docs/agent/interface-designs-NNN.md`. Note user's selection.

Type /next when artifact is written.
