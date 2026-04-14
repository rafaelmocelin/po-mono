import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type IssueStatus = "backlog" | "in-progress" | "done" | "blocked";

export type PipelineStepName = "grill-me" | "write-a-prd" | "design-an-interface" | "prd-to-issues" | "tdd" | "done";

export interface StepCost {
	input_tokens: number;
	output_tokens: number;
	model: string;
	usd: number;
}

export interface CompletedStep {
	step: PipelineStepName;
	completed_at: string;
	artifact: string;
	cost: StepCost;
}

export interface IssueRecord {
	number: number;
	github_issue: number | null;
	status: IssueStatus;
	branch: string | null;
}

export interface PipelineState {
	pipeline_id: string;
	started_at: string;
	current_step: PipelineStepName;
	current_issue: string | null;
	steps_completed: CompletedStep[];
	issues: IssueRecord[];
}

export function loadState(cwd: string): PipelineState | null {
	const statePath = join(cwd, ".po", "pipeline-state.json");
	if (!existsSync(statePath)) return null;
	return JSON.parse(readFileSync(statePath, "utf-8")) as PipelineState;
}

export function saveState(cwd: string, state: PipelineState): void {
	const dir = join(cwd, ".po");
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
	const statePath = join(dir, "pipeline-state.json");
	const tmpPath = `${statePath}.tmp`;
	writeFileSync(tmpPath, JSON.stringify(state, null, 2), "utf-8");
	renameSync(tmpPath, statePath);
}

export function createFreshState(): PipelineState {
	return {
		pipeline_id: randomUUID(),
		started_at: new Date().toISOString(),
		current_step: "grill-me",
		current_issue: null,
		steps_completed: [],
		issues: [],
	};
}
