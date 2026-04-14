import type { Orchestrator } from "./orchestrator.js";

/**
 * Formats the pipeline status bar string.
 * Returns undefined when no pipeline is active (clears the status).
 */
export function formatPipelineStatus(
	orchestrator: Orchestrator,
	activeModel: string,
	totalCostUsd: number,
): string | undefined {
	if (!orchestrator.isActive || !orchestrator.state) return undefined;

	const { state } = orchestrator;
	const pipelineId = `prd-${String(state.steps_completed.length + 1).padStart(3, "0")}`;
	const stepLabel = orchestrator.currentIssue
		? `${state.current_step} #${orchestrator.currentIssue}`
		: (state.current_step ?? "");

	const done = state.issues.filter((i) => i.status === "done").length;
	const total = state.issues.length;
	const blocked = state.issues.filter((i) => i.status === "blocked").map((i) => `#${i.number}`);
	const issueStr =
		total > 0 ? `${done}/${total} issues${blocked.length > 0 ? ` | blocked: ${blocked.join(",")}` : ""}` : "";

	const parts = [
		`PIPELINE: ${pipelineId}`,
		`STEP: ${stepLabel}`,
		`MODEL: ${activeModel}`,
		issueStr,
		`$${totalCostUsd.toFixed(2)}`,
	].filter(Boolean);

	return parts.map((p) => `[${p}]`).join(" ");
}

/** Sum USD cost from all completed steps in the pipeline state. */
export function totalCost(state: import("./state.js").PipelineState): number {
	return state.steps_completed.reduce((sum, s) => sum + s.cost.usd, 0);
}
