import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { PipelineStepName } from "./state.js";

export interface SummaryBridgeOptions {
	cwd: string;
	step: PipelineStepName;
	/** Full text of the step session to summarize */
	sessionTranscript: string;
	/** Run the Haiku session to produce the summary (injected by extension) */
	runHaikuSummary: (prompt: string) => Promise<string>;
}

const SUMMARY_PROMPT = `You are summarizing a completed pipeline step session for context handoff.
Produce a structured summary covering:
1. Key decisions made and their rationale
2. Constraints identified
3. Deferred items (explicitly out of scope)
4. Output artifacts produced (file paths)
5. Open questions or blockers (if any)

Be terse. Use bullet points. Do not reproduce large code blocks — reference file paths instead.

SESSION TRANSCRIPT:
`;

/**
 * Generates a Haiku summary of a completed step session and writes it to
 * docs/agent/summaries/step-<name>-summary.md.
 */
export async function generateStepSummary(opts: SummaryBridgeOptions): Promise<string> {
	const summaryContent = await opts.runHaikuSummary(SUMMARY_PROMPT + opts.sessionTranscript);

	const summaryDir = join(opts.cwd, "docs", "agent", "summaries");
	if (!existsSync(summaryDir)) mkdirSync(summaryDir, { recursive: true });

	const summaryPath = join(summaryDir, `step-${opts.step}-summary.md`);
	writeFileSync(summaryPath, `# Step: ${opts.step}\n\n${summaryContent}`, "utf-8");

	return summaryPath;
}

/** Load all available step summaries as context for the next step. */
export function loadPriorSummaries(cwd: string): string {
	const summaryDir = join(cwd, "docs", "agent", "summaries");
	if (!existsSync(summaryDir)) return "";

	const files = readdirSync(summaryDir)
		.filter((f: string) => f.endsWith("-summary.md"))
		.sort();

	if (files.length === 0) return "";

	const summaries = files.map((f: string) => readFileSync(join(summaryDir, f), "utf-8"));
	return `## Prior Step Summaries\n\n${summaries.join("\n\n---\n\n")}`;
}
