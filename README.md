# po

**po** is a fork of [badlogic/pi-mono](https://github.com/badlogic/pi-mono) that layers three capabilities on top of the pi coding agent:

1. **RTK token compression** — every bash command is transparently routed through the [RTK](https://github.com/rtk-ai/rtk) binary, cutting token usage 60–90% on verbose operations (`git log`, `npm install`, `grep`, etc.)
2. **Three-tier model system** — Opus for planning, Sonnet for implementation, Haiku for mechanical tasks. Each pipeline step runs at the right tier automatically, with fallback chains on rate limits.
3. **Pipeline orchestrator** — a state machine that sequences grill-me → write-a-prd → prd-to-issues → tdd, with Matt Pocock's TDD methodology embedded as first-class slash commands.

<p align="center">
  <img alt="Build status" src="https://img.shields.io/github/actions/workflow/status/rafaelmocelin/pi-mono/ci.yml?style=flat-square&branch=main" />
</p>

---

## Table of Contents

- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Pipeline Commands](#pipeline-commands)
- [Pipeline Steps](#pipeline-steps)
- [RTK Token Compression](#rtk-token-compression)
- [Architecture](#architecture)
- [Development](#development)
- [Packages](#packages)
- [Upstream](#upstream)
- [License](#license)

---

## Quick Start

**Prerequisites:**

```bash
# Node 22+
node --version

# RTK binary (token compression)
# Install from: https://github.com/rtk-ai/rtk#installation
rtk --version

# GitHub CLI (for issue sync)
gh auth login
```

**Clone and build:**

```bash
git clone https://github.com/rafaelmocelin/pi-mono.git po
cd po
npm install
npm run build
```

**Run `/setup` to verify dependencies:**

```bash
./packages/coding-agent/dist/cli.js
# then inside po:
/setup
```

---

## Configuration

Create `~/.po/settings.json`:

```json
{
  "tier1Model": "claude-opus-4-6",
  "tier2Model": "claude-sonnet-4-6",
  "tier3Model": "claude-haiku-4-5-20251001",
  "apiKey": "sk-ant-..."
}
```

| Key | Default | Description |
|---|---|---|
| `tier1Model` | `claude-opus-4-6` | Planning steps (grill-me, write-a-prd, design-an-interface) |
| `tier2Model` | `claude-sonnet-4-6` | Implementation steps (tdd) |
| `tier3Model` | `claude-haiku-4-5-20251001` | Mechanical steps (prd-to-issues, summaries) |
| `apiKey` | — | Anthropic API key (or set `ANTHROPIC_API_KEY` env var) |

**Load the pipeline extension:**

```bash
mkdir -p ~/.po/agent/extensions
cp packages/coding-agent/src/pipeline/pipeline.extension.ts ~/.po/agent/extensions/
```

---

## Pipeline Commands

| Command | Description |
|---|---|
| `/pipeline` | Start full pipeline from grill-me |
| `/pipeline --from <step>` | Resume from a specific step |
| `/pipeline --step <step>` | Run one step in isolation |
| `/pipeline --issue <N>` | Jump to TDD for a specific GitHub issue |
| `/pipeline --design` | Include the design-an-interface step |
| `/pipeline --resume` | Resume from persisted state |
| `/grill-me` | Standalone requirements interview |
| `/tdd` | Standalone TDD loop |
| `/improve-architecture` | On-demand architecture review with RFC output |
| `/board` | Issue board from local cache |
| `/costs` | Per-step cost breakdown |
| `/next` | Advance pipeline (confirm step complete) |
| `/rtk-stats` | RTK token savings report (`rtk gain`) |
| `/setup` | Verify dependencies are installed |

---

## Pipeline Steps

```
grill-me
  Requirements interview using a decision tree tracker.
  Surfaces OPEN / RESOLVED / DEFERRED decisions before writing a line of spec.
  Output: docs/agent/grill-me-decisions.md
  Tier: Opus

write-a-prd
  Converts decisions into a structured PRD with 7 sections
  including a Test Strategy section.
  Output: docs/agent/prd-NNN.md
  Tier: Opus

[design-an-interface]   (--design flag only)
  "Design It Twice" (Ousterhout) — spawns 3+ sub-agents in parallel,
  each with a different design constraint. Outputs a comparison matrix.
  Output: docs/agent/interface-designs-NNN.md
  Tier: Opus

prd-to-issues
  Converts PRD into vertical-slice GitHub issues.
  Each issue is a complete tracer bullet: test → implementation → integration.
  Syncs to GitHub and caches locally in docs/agent/issues/
  Tier: Haiku (caveman mode)

tdd
  RED → GREEN → commit loop per issue.
  Escalates after 3 failed attempts.
  Output: committed, passing tests.
  Tier: Sonnet (caveman mode)
```

**Cross-step context:** After each step, Haiku generates a structured summary saved to `docs/agent/summaries/step-<name>-summary.md`. The next step loads all prior summaries as initial context.

**State persistence:** `.po/pipeline-state.json` — written atomically (write to `.tmp`, then rename).

**GitHub sync:** Issue status is synced from GitHub on every `/pipeline` invocation. GitHub is source of truth.

---

## RTK Token Compression

RTK is a binary proxy that intercepts stdout from bash commands and strips noise before it reaches the model. Command-specific transforms include:

- `git log` / `git diff` — limits context, strips binary blobs
- `npm install` / `npm ci` — strips progress bars and audit noise
- `grep` / `rg` — limits result depth

All commands are rewritten transparently via the `BashOperations` injection in `agent-session.ts`. No changes to existing workflows required.

Bypass RTK for a session: `po --no-rtk`

Check accumulated savings: `rtk gain`

---

## Architecture

All po-specific behavior lives in a single pi extension and a self-contained `src/pipeline/` module. The pi core is untouched except one additive change to `agent-session.ts` (RTK injection).

```
packages/coding-agent/src/pipeline/
├── pipeline.extension.ts   # Extension entry point — registers all commands & hooks
├── orchestrator.ts         # State machine + module-level singleton (getOrchestrator)
├── state.ts                # Reads/writes .po/pipeline-state.json atomically
├── step-runner.ts          # Assembles skill context + starts step sessions
├── summary-bridge.ts       # Haiku cross-step summary generation
├── cost-tracker.ts         # Per-step token and cost accounting
├── status-bar.ts           # Pipeline status string for the terminal footer
├── caveman.ts              # Caveman prompt constant (65-75% output reduction)
├── model-tiers.ts          # Tier → model ID resolution + 429 fallback chain
├── rtk-operations.ts       # BashOperations wrapper routing commands through RTK
├── github-sync.ts          # gh issue list → local .md cache synchronization
└── skills/
    ├── grill-me.md
    ├── write-a-prd.md
    ├── design-an-interface.md
    ├── prd-to-issues.md
    ├── tdd.md
    └── improve-codebase-architecture.md
```

Each skill file has YAML frontmatter (`name`, `tier`, `caveman`, `input_artifacts`, `output_artifact`, `preserve_on_compaction`) followed by the prompt body. The step-runner reads the frontmatter to select the model tier, apply caveman mode, and configure compaction preservation.

**Extension hooks used:**

| Hook | Purpose |
|---|---|
| `session_start` | Inject pending step context into a new session |
| `session_before_compact` | Pass preservation list to the Haiku summarizer |
| `registerCommand` | Register all `/pipeline`, `/tdd`, `/grill-me`, etc. |

---

## Development

```bash
npm install                                                # install dependencies
npm run build                                              # compile all packages
npm run check                                             # biome lint + typecheck (fix all before committing)
cd packages/coding-agent && npm test -- test/pipeline/   # pipeline unit tests
npm test                                                  # all tests
```

**Coding conventions (enforced by biome):**

- TypeScript strict mode — no `any`, use `unknown` + narrowing
- Template literals over string concatenation
- `Number.isNaN` not `isNaN`; `parseInt(x, 10)` with explicit radix
- ESM only — no `require()`, use `import.meta.url` for `__dirname`
- No default exports except the extension factory

See `AGENTS.md` for the complete guide (also read by agentic workers).

---

## Packages

| Package | Description |
|---|---|
| `packages/coding-agent` | The po CLI — `po` binary, pipeline modules, skills |
| `packages/ai` | Unified multi-provider LLM API (Anthropic, OpenAI, Google, etc.) |
| `packages/agent` | Agent runtime with tool calling and state management |
| `packages/tui` | Terminal UI library with differential rendering |

Packages removed from upstream: `pi-web-ui`, `pi-slack`, `pi-vllm`.

---

## Upstream

po tracks [badlogic/pi-mono](https://github.com/badlogic/pi-mono) as `upstream`. Pull upstream changes as needed:

```bash
git fetch upstream
git merge upstream/main
```

---

## License

MIT — same as pi-mono. See [LICENSE](LICENSE).
