# AGENTS.md — po

po is a fork of badlogic/pi-mono that adds RTK token compression, a three-tier model system, and a pipeline orchestrator embedding Matt Pocock's TDD methodology as first-class slash commands.

## Test Commands

```bash
npm test --workspace packages/coding-agent                        # all unit tests
npm test --workspace packages/coding-agent -- test/pipeline/      # pipeline tests only
npm run build                                                      # full build
npm run check                                                      # lint + typecheck (biome + tsgo)
```

## Test Framework

Vitest. Test files in `packages/coding-agent/test/`.
Pipeline tests in `packages/coding-agent/test/pipeline/`.

Run tests from the package root (`packages/coding-agent`), not the repo root.
If you create or modify a test file, run it and iterate until it passes.

## File Conventions

- Pipeline modules: `packages/coding-agent/src/pipeline/`
- Skills: `packages/coding-agent/src/pipeline/skills/`
- Skill frontmatter fields: `name`, `tier` (1–3), `caveman` (bool), `input_artifacts`, `output_artifact`, `preserve_on_compaction`
- Extension entry: `packages/coding-agent/src/pipeline/pipeline.extension.ts`
- Extension loader: `~/.po/agent/extensions/pipeline.extension.js` — a thin JS wrapper that re-exports from `dist/pipeline/pipeline.extension.js` using an absolute path
- Skills at runtime: `packages/coding-agent/dist/pipeline/skills/` — copied there by `npm run build` (copy-assets step)
- Pipeline state: `.po/pipeline-state.json` (written atomically)
- Issue cache: `docs/agent/issues/NNN-slug.md` (YAML frontmatter)
- Step summaries: `docs/agent/summaries/step-<name>-summary.md`
- Spec / design docs: `docs/superpowers/specs/`
- Implementation plan: `docs/superpowers/plans/`

## Coding Conventions

- TypeScript strict mode — no `any`, use `unknown` + narrowing
- No default exports except for the extension factory (`export default function pipelineExtension`)
- Module-level singletons exported as `get<Name>(cwd)` (e.g. `getOrchestrator`)
- All file I/O uses Node `fs` directly — no wrappers
- Template literals preferred over string concatenation (biome enforces this)
- `Number.isNaN` not `isNaN`; `parseInt(x, 10)` with explicit radix
- Biome handles formatting — tabs, double quotes for JSX
- After code changes: `npm run check` from repo root. Fix all errors, warnings, and infos before committing.
- NEVER use inline dynamic imports — always use standard top-level imports

## Architecture Notes

- **RTK wrapping:** `createRtkBashOperations()` injected at session creation in `core/agent-session.ts`. Bypass with `--no-rtk` CLI flag.
- **Model tiers:** Read from `~/.po/settings.json` via `getPoSettings()`. Tier 1 = planning (Opus), Tier 2 = implementation (Sonnet), Tier 3 = mechanical (Haiku).
- **Fallback chain:** On 429 rate limit, `resolveModelId()` cycles through the tier's model list. Full exhaustion → exponential backoff.
- **Pipeline state:** `.po/pipeline-state.json` written atomically (write to `.tmp`, then rename).
- **Step sessions:** Created via `ctx.newSession()` in the extension. The `session_start` handler picks up pending step context set by `setPendingStep()`.
- **Compaction hook:** `pi.on("session_before_compact", ...)` — preservation list from the active skill's frontmatter.
- **Cross-step context:** Haiku generates a structured summary of each completed step via `summary-bridge.ts`. Loaded by step-runner for the next step's initial context.
- **GitHub sync:** `syncIssuesFromGithub()` runs on every `/pipeline` invocation. GitHub is source of truth.

## Pipeline Slash Commands

| Command | Description |
|---|---|
| `/pipeline` | Start full pipeline from grill-me |
| `/pipeline --from <step>` | Resume from a specific step |
| `/pipeline --step <step>` | Run one step standalone |
| `/pipeline --issue <N>` | Jump to TDD for a specific issue |
| `/pipeline --design` | Include design-an-interface step |
| `/pipeline --resume` | Resume from persisted state |
| `/grill-me` | Standalone grill-me |
| `/tdd` | Standalone TDD |
| `/improve-architecture` | On-demand architecture review |
| `/board` | Issue board from local cache |
| `/costs` | Per-step cost breakdown |
| `/next` | Advance pipeline (confirm step complete) |
| `/rtk-stats` | RTK token savings |
| `/setup` | Check dependencies (rtk, gh, git) |

## Adding a New Pipeline Step

1. Add skill file: `packages/coding-agent/src/pipeline/skills/<name>.md` with required frontmatter.
2. Add the step name to `PipelineStepName` union in `state.ts`.
3. Insert into the step sequence in `orchestrator.ts` (`STEPS_WITHOUT_DESIGN` / `STEPS_WITH_DESIGN`).
4. Register a slash command in `pipeline.extension.ts` if it needs a standalone entrypoint.
5. Set `caveman` on/off per the table in `po-build-plan.md`.

## Git Rules

- NEVER commit unless user asks
- ONLY commit files YOU changed in THIS session — never `git add -A` or `git add .`
- Always `npm run check` before committing; fix all errors and warnings
- No `git reset --hard`, `git checkout .`, `git clean -fd`, `git stash`, `git commit --no-verify`

## Style

- No emojis in commits, issues, PR comments, or code
- No fluff or cheerful filler text — technical prose only
- Keep answers short and concise
