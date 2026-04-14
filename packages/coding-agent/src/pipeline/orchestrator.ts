import {
	createFreshState,
	loadState,
	type PipelineState,
	type PipelineStepName,
	type StepCost,
	saveState,
} from "./state.js";

const STEPS_WITHOUT_DESIGN: PipelineStepName[] = ["grill-me", "write-a-prd", "prd-to-issues", "tdd", "done"];

const STEPS_WITH_DESIGN: PipelineStepName[] = [
	"grill-me",
	"write-a-prd",
	"design-an-interface",
	"prd-to-issues",
	"tdd",
	"done",
];

export class Orchestrator {
	private _state: PipelineState | null = null;
	private _cwd: string;
	private _includeDesign = false;
	private _preservationList: string[] = [];

	constructor(cwd: string) {
		this._cwd = cwd;
	}

	get isActive(): boolean {
		return this._state !== null && this._state.current_step !== "done";
	}

	get currentStep(): PipelineStepName | null {
		return this._state?.current_step ?? null;
	}

	get currentIssue(): string | null {
		return this._state?.current_issue ?? null;
	}

	get state(): PipelineState | null {
		return this._state;
	}

	/** Preservation list for the active step (set by step-runner from skill frontmatter). */
	get preservationList(): string[] {
		return this._preservationList;
	}

	setPreservationList(list: string[]): void {
		this._preservationList = list;
	}

	start(includeDesign = false): PipelineState {
		this._includeDesign = includeDesign;
		this._state = createFreshState();
		saveState(this._cwd, this._state);
		return this._state;
	}

	resume(): PipelineState | null {
		this._state = loadState(this._cwd);
		return this._state;
	}

	advance(artifact: string, cost: StepCost): void {
		if (!this._state) throw new Error("No active pipeline");
		const completedStep = this._state.current_step;
		this._state.steps_completed.push({
			step: completedStep,
			completed_at: new Date().toISOString(),
			artifact,
			cost,
		});
		const steps = this._includeDesign ? STEPS_WITH_DESIGN : STEPS_WITHOUT_DESIGN;
		const idx = steps.indexOf(completedStep);
		this._state.current_step = steps[idx + 1] ?? "done";
		this._preservationList = [];
		saveState(this._cwd, this._state);
	}

	jumpTo(step: PipelineStepName): void {
		if (!this._state) throw new Error("No active pipeline");
		this._state.current_step = step;
		saveState(this._cwd, this._state);
	}

	jumpToIssue(issueNumber: string): void {
		if (!this._state) throw new Error("No active pipeline");
		this._state.current_step = "tdd";
		this._state.current_issue = issueNumber;
		saveState(this._cwd, this._state);
	}

	updateIssue(issueNumber: number, updates: Partial<import("./state.js").IssueRecord>): void {
		if (!this._state) return;
		const issue = this._state.issues.find((i) => i.number === issueNumber);
		if (issue) Object.assign(issue, updates);
		saveState(this._cwd, this._state);
	}

	addIssue(issue: import("./state.js").IssueRecord): void {
		if (!this._state) return;
		this._state.issues.push(issue);
		saveState(this._cwd, this._state);
	}
}

/** Module-level singleton — pipeline.extension.ts reads this to check active step. */
let _instance: Orchestrator | null = null;

export function getOrchestrator(cwd: string): Orchestrator {
	if (!_instance) _instance = new Orchestrator(cwd);
	return _instance;
}

/** Reset singleton — used in tests only. */
export function _resetOrchestratorForTesting(): void {
	_instance = null;
}
