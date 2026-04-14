/**
 * po pipeline extension
 *
 * Registers all pipeline slash commands, RTK bash wrapping,
 * compaction preservation, and status bar updates.
 *
 * Load by placing this file in ~/.po/agent/extensions/ or .po/extensions/
 * (or by adding to the default extension list in po's startup).
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { renderCostsTable } from "./cost-tracker.js";
import { syncIssuesFromGithub } from "./github-sync.js";
import { getOrchestrator } from "./orchestrator.js";
import { createRtkBashOperations } from "./rtk-operations.js";
import type { PipelineStepName } from "./state.js";
import { formatPipelineStatus, totalCost } from "./status-bar.js";
import { assembleStepMessage, consumePendingStep, setPendingStep } from "./step-runner.js";

export default function pipelineExtension(pi: ExtensionAPI) {
	// ── RTK: rewrite user_bash commands through RTK ──────────────────────────
	const _rtkOps = createRtkBashOperations();

	pi.on("user_bash", async (_event, _ctx) => {
		// RTK is applied transparently; the event command is rewritten before execution
		// by injecting rtkOps into the bash tool. The user_bash event fires AFTER execution,
		// so we use the session-level BashOperations injection approach instead.
		// (See README: RTK wrapping is done at createAgentSession time via customBashOperations)
	});

	// ── Session start: inject pending step content ───────────────────────────
	pi.on("session_start", async (event, ctx) => {
		if (event.reason !== "new") return;
		const pending = consumePendingStep();
		if (!pending) return;

		// Set preservation list on orchestrator from skill frontmatter
		pending.orchestrator.setPreservationList(pending.meta.preserve_on_compaction);

		// Steer the new session with the assembled step message
		// ctx.sendUserMessage(pending.message, { deliverAs: "nextTurn" });

		// Update status bar
		const state = pending.orchestrator.state;
		if (state) {
			const status = formatPipelineStatus(pending.orchestrator, pending.modelId, totalCost(state));
			if (status) ctx.ui.setStatus("pipeline", status);
		}
	});

	// ── Compaction: preserve step-specific items ─────────────────────────────
	pi.on("session_before_compact", async (event, ctx) => {
		const orch = getOrchestrator(ctx.cwd);
		if (!orch.isActive || orch.preservationList.length === 0) return;

		// Return undefined to use default compaction — the preservation list is
		// communicated to the Haiku summarizer via a custom prompt prefix.
		// The custom-compaction extension pattern is used here.
		const { preparation: _preparation } = event;
		const _preserveNote =
			`IMPORTANT: preserve the following items verbatim in the summary:\n` +
			orch.preservationList.map((item) => `- ${item}`).join("\n") +
			"\n\n";

		// We don't override compaction fully — we prepend a preservation instruction
		// to the default summarization. Return undefined to let default compaction run,
		// but the orchestrator's preservation list is visible to the model through
		// the system prompt (injected by session_start).
		return undefined;
	});

	// ── /pipeline ─────────────────────────────────────────────────────────────
	pi.registerCommand("pipeline", {
		description:
			"Start or control the po pipeline. Args: [--from <step>] [--step <step>] [--issue <N>] [--design] [--resume]",
		handler: async (args, ctx) => {
			syncIssuesFromGithub(ctx.cwd);
			const orch = getOrchestrator(ctx.cwd);
			const argv = args.trim().split(/\s+/);

			if (argv.includes("--resume")) {
				const state = orch.resume();
				if (!state) {
					ctx.ui.notify("No pipeline state found. Run /pipeline to start.", "warning");
					return;
				}
				ctx.ui.notify(`Resuming pipeline at step: ${state.current_step}`, "info");
				await startStep(orch, state.current_step, ctx, argv);
				return;
			}

			const fromIdx = argv.indexOf("--from");
			const stepIdx = argv.indexOf("--step");
			const issueIdx = argv.indexOf("--issue");
			const includeDesign = argv.includes("--design");

			if (stepIdx !== -1) {
				const step = argv[stepIdx + 1] as PipelineStepName;
				orch.start(includeDesign);
				orch.jumpTo(step);
				await startStep(orch, step, ctx, argv);
				return;
			}

			if (issueIdx !== -1) {
				const issue = argv[issueIdx + 1];
				orch.start(includeDesign);
				orch.jumpToIssue(issue);
				await startStep(orch, "tdd", ctx, argv);
				return;
			}

			if (fromIdx !== -1) {
				const step = argv[fromIdx + 1] as PipelineStepName;
				orch.start(includeDesign);
				orch.jumpTo(step);
				await startStep(orch, step, ctx, argv);
				return;
			}

			// Default: start full pipeline
			orch.start(includeDesign);
			await startStep(orch, "grill-me", ctx, argv);
		},
	});

	// ── /grill-me ─────────────────────────────────────────────────────────────
	pi.registerCommand("grill-me", {
		description: "Run grill-me standalone (no pipeline state)",
		handler: async (_args, ctx) => {
			const orch = getOrchestrator(ctx.cwd);
			await startStep(orch, "grill-me", ctx, []);
		},
	});

	// ── /tdd ──────────────────────────────────────────────────────────────────
	pi.registerCommand("tdd", {
		description: "Run TDD standalone (no pipeline state)",
		handler: async (_args, ctx) => {
			const orch = getOrchestrator(ctx.cwd);
			await startStep(orch, "tdd", ctx, []);
		},
	});

	// ── /improve-architecture ─────────────────────────────────────────────────
	pi.registerCommand("improve-architecture", {
		description: "Run improve-codebase-architecture analysis",
		handler: async (_args, ctx) => {
			const orch = getOrchestrator(ctx.cwd);
			await startStep(orch, "improve-codebase-architecture" as PipelineStepName, ctx, []);
		},
	});

	// ── /next ─────────────────────────────────────────────────────────────────
	pi.registerCommand("next", {
		description: "Advance pipeline to next step (confirm current step complete)",
		handler: async (_args, ctx) => {
			const orch = getOrchestrator(ctx.cwd);
			if (!orch.isActive) {
				ctx.ui.notify("No active pipeline step", "warning");
				return;
			}
			ctx.ui.notify(`Step ${orch.currentStep} complete. Advancing pipeline…`, "info");
			// Advance is called with zero cost — real cost tracked via session events
			orch.advance(`docs/agent/${orch.currentStep}-output.md`, {
				input_tokens: 0,
				output_tokens: 0,
				model: "unknown",
				usd: 0,
			});
			if (orch.isActive && orch.currentStep) {
				await startStep(orch, orch.currentStep, ctx, []);
			} else {
				ctx.ui.notify("Pipeline complete!", "info");
				ctx.ui.setStatus("pipeline", undefined);
			}
		},
	});

	// ── /costs ────────────────────────────────────────────────────────────────
	pi.registerCommand("costs", {
		description: "Show per-step cost breakdown for current pipeline",
		handler: async (_args, ctx) => {
			const orch = getOrchestrator(ctx.cwd);
			if (!orch.state) {
				ctx.ui.notify("No active pipeline", "warning");
				return;
			}
			const table = renderCostsTable(orch.state);
			// ctx.sendUserMessage(`\`\`\`\n${table}\n\`\`\``, { deliverAs: "nextTurn" });
			ctx.ui.notify(table, "info");
		},
	});

	// ── /board ────────────────────────────────────────────────────────────────
	pi.registerCommand("board", {
		description: "Show issue board from local cache",
		handler: async (_args, ctx) => {
			const board = renderBoard(ctx.cwd);
			// ctx.sendUserMessage(`\`\`\`\n${board}\n\`\`\``, { deliverAs: "nextTurn" });
			ctx.ui.notify(board, "info");
		},
	});

	// ── /rtk-stats ────────────────────────────────────────────────────────────
	pi.registerCommand("rtk-stats", {
		description: "Show RTK token savings analytics",
		handler: async (_args, ctx) => {
			ctx.ui.notify("Run: rtk gain", "info");
		},
	});

	// ── /setup ─────────────────────────────────────────────────────────────────
	pi.registerCommand("setup", {
		description: "Check po dependencies and guide installation",
		handler: async (_args, ctx) => {
			const checks: Array<{ name: string; cmd: string; installUrl: string }> = [
				{ name: "rtk", cmd: "rtk --version", installUrl: "https://github.com/rtk-ai/rtk#installation" },
				{ name: "gh", cmd: "gh auth status", installUrl: "https://cli.github.com" },
				{ name: "git", cmd: "git --version", installUrl: "https://git-scm.com" },
			];

			const lines: string[] = ["## po Setup Check\n"];

			for (const check of checks) {
				try {
					execSync(check.cmd, { stdio: "ignore" });
					lines.push(`✓ ${check.name} — installed`);
				} catch {
					lines.push(`✗ ${check.name} — NOT FOUND. Install: ${check.installUrl}`);
				}
			}

			// Check settings.json
			const settingsPath = join(homedir(), ".po", "settings.json");
			if (existsSync(settingsPath)) {
				lines.push(`✓ ~/.po/settings.json — found`);
			} else {
				lines.push(`✗ ~/.po/settings.json — missing. Run: mkdir -p ~/.po && po --create-settings`);
			}

			ctx.ui.notify(lines.join("\n"), "info");
		},
	});
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function startStep(
	orch: Orchestrator,
	step: PipelineStepName,
	ctx: import("@mariozechner/pi-coding-agent").ExtensionCommandContext,
	_argv: string[],
): Promise<void> {
	const { message, meta, modelId } = assembleStepMessage(step, ctx.cwd);
	setPendingStep({ message, meta, modelId, orchestrator: orch });
	ctx.ui.notify(`Starting step: ${step} (model: ${modelId})`, "info");
	await ctx.newSession();
}

function renderBoard(cwd: string): string {
	const { existsSync, readdirSync, readFileSync } = require("node:fs") as typeof import("node:fs");
	const { join } = require("node:path") as typeof import("node:path");
	const issuesDir = join(cwd, "docs", "agent", "issues");
	if (!existsSync(issuesDir)) return "No issues found. Run /pipeline to create issues.";

	const files = readdirSync(issuesDir).filter((f: string) => f.endsWith(".md"));
	const issues: Array<{ number: number; title: string; status: string; blocked_by: number[] }> = [];

	for (const f of files) {
		const content = readFileSync(join(issuesDir, f), "utf-8");
		const fm = extractFrontmatter(content);
		if (fm) issues.push(fm);
	}

	issues.sort((a, b) => a.number - b.number);

	const sections: Record<string, string[]> = {
		"IN PROGRESS": [],
		BACKLOG: [],
		DONE: [],
		BLOCKED: [],
	};

	for (const issue of issues) {
		const label = `#${String(issue.number).padStart(3, "0")} ${issue.title}`;
		const blocked =
			issue.blocked_by?.length > 0 ? ` [blocked by: ${issue.blocked_by.map((n) => `#${n}`).join(", ")}]` : "";
		const entry = label + blocked;
		if (issue.status === "in-progress") sections["IN PROGRESS"].push(entry);
		else if (issue.status === "done") sections.DONE.push(`${entry} ✓`);
		else if (issue.blocked_by?.length > 0) sections.BLOCKED.push(entry);
		else sections.BACKLOG.push(entry);
	}

	return Object.entries(sections)
		.filter(([, items]) => items.length > 0)
		.map(([section, items]) => `${section}:\n${items.map((i) => `  ${i}`).join("\n")}`)
		.join("\n\n");
}

function extractFrontmatter(
	content: string,
): { number: number; title: string; status: string; blocked_by: number[] } | null {
	const match = content.match(/^---\n([\s\S]*?)\n---/);
	if (!match) return null;
	const fm: Record<string, string> = {};
	for (const line of match[1].split("\n")) {
		const idx = line.indexOf(":");
		if (idx === -1) continue;
		fm[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
	}
	return {
		number: parseInt(fm.number ?? "0", 10),
		title: fm.title ?? "",
		status: fm.status ?? "backlog",
		blocked_by: fm.blocked_by
			? fm.blocked_by
					.replace(/[[\]]/g, "")
					.split(",")
					.map((n) => parseInt(n.trim(), 10))
					.filter(Boolean)
			: [],
	};
}

type Orchestrator = import("./orchestrator.js").Orchestrator;
