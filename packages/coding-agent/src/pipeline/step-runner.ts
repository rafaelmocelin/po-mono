import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CAVEMAN_PROMPT } from "./caveman.js";
import { resolveModelId, type TierName } from "./model-tiers.js";
import type { Orchestrator } from "./orchestrator.js";
import type { PipelineStepName } from "./state.js";
import { loadPriorSummaries } from "./summary-bridge.js";

/** Parsed metadata from a skill file's YAML frontmatter. */
export interface SkillMeta {
	name: string;
	tier: number;
	caveman: boolean;
	input_artifacts: string[];
	output_artifact: string;
	preserve_on_compaction: string[];
}

/**
 * Load a skill file from src/pipeline/skills/<name>.md.
 * Returns { meta, body } where body is the prompt content below the frontmatter.
 */
export function loadSkill(skillName: PipelineStepName): { meta: SkillMeta; body: string } {
	// Skills live alongside the compiled JS at runtime
	const __dirname = dirname(fileURLToPath(import.meta.url));
	const skillsDir = join(__dirname, "skills");
	const skillPath = join(skillsDir, `${skillName}.md`);
	if (!existsSync(skillPath)) {
		throw new Error(`Skill file not found: ${skillPath}`);
	}
	const raw = readFileSync(skillPath, "utf-8");
	const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
	if (!match) throw new Error(`Invalid skill format: ${skillPath}`);

	const frontmatter = parseFrontmatter(match[1]);
	const body = match[2].trim();
	return { meta: frontmatter as unknown as SkillMeta, body };
}

function parseFrontmatter(raw: string): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const line of raw.split("\n")) {
		const colonIdx = line.indexOf(":");
		if (colonIdx === -1) continue;
		const key = line.slice(0, colonIdx).trim();
		const val = line.slice(colonIdx + 1).trim();
		if (val === "true") result[key] = true;
		else if (val === "false") result[key] = false;
		else if (!Number.isNaN(Number(val)) && val !== "") result[key] = Number(val);
		else if (val.startsWith("[") || val.startsWith("-")) {
			// Simple YAML list — handled at a basic level
			result[key] = [];
		} else result[key] = val;
	}
	// Handle multi-line lists (preserve_on_compaction, input_artifacts)
	const listKeys = ["preserve_on_compaction", "input_artifacts"];
	for (const key of listKeys) {
		const regex = new RegExp(`^${key}:\\s*\\n((?:  - .*\\n?)*)`, "m");
		const m = raw.match(regex);
		if (m) {
			result[key] = m[1]
				.split("\n")
				.filter((l) => l.trim().startsWith("- "))
				.map((l) => l.replace(/^\s*-\s*/, "").replace(/^["']|["']$/g, ""));
		}
	}
	return result;
}

/**
 * Assemble the initial message for a pipeline step session.
 * Includes: optional caveman prefix, prior step summaries, AGENTS.md content,
 * and the skill body.
 */
export function assembleStepMessage(
	skillName: PipelineStepName,
	cwd: string,
	modelOverride?: string,
): { message: string; meta: SkillMeta; modelId: string } {
	const { meta, body } = loadSkill(skillName);

	const tierMap: Record<number, TierName> = { 1: "tier1", 2: "tier2", 3: "tier3" };
	const tier = tierMap[meta.tier] ?? "tier2";
	const modelId = modelOverride ?? resolveModelId(tier);

	const parts: string[] = [];

	if (meta.caveman) {
		parts.push(`[OPERATING MODE: ${CAVEMAN_PROMPT}]\n`);
	}

	const summaries = loadPriorSummaries(cwd);
	if (summaries) parts.push(summaries);

	const agentsMdPath = join(cwd, "AGENTS.md");
	if (existsSync(agentsMdPath)) {
		parts.push(`## Project Instructions (AGENTS.md)\n\n${readFileSync(agentsMdPath, "utf-8")}`);
	}

	parts.push(`## Your Task\n\n${body}`);

	return { message: parts.join("\n\n"), meta, modelId };
}

/**
 * Context stored between newSession() call and session_start event.
 * The extension's session_start handler picks this up and steers the new session.
 */
export interface PendingStepContext {
	message: string;
	meta: SkillMeta;
	modelId: string;
	orchestrator: Orchestrator;
}

let _pendingStep: PendingStepContext | null = null;

export function setPendingStep(ctx: PendingStepContext): void {
	_pendingStep = ctx;
}

export function consumePendingStep(): PendingStepContext | null {
	const val = _pendingStep;
	_pendingStep = null;
	return val;
}
