import { existsSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFreshState, loadState, saveState } from "../../src/pipeline/state.js";

const TEST_DIR = join(tmpdir(), "po-state-test-" + Date.now());

beforeEach(() => mkdirSync(TEST_DIR, { recursive: true }));
afterEach(() => rmSync(TEST_DIR, { recursive: true, force: true }));

describe("loadState", () => {
	it("returns null when no state file exists", () => {
		expect(loadState(TEST_DIR)).toBeNull();
	});
});

describe("saveState + loadState round-trip", () => {
	it("persists and restores state", () => {
		const state = createFreshState();
		state.current_step = "write-a-prd";
		saveState(TEST_DIR, state);
		const loaded = loadState(TEST_DIR);
		expect(loaded?.current_step).toBe("write-a-prd");
		expect(loaded?.pipeline_id).toBe(state.pipeline_id);
	});

	it("write is atomic (uses .tmp then rename)", () => {
		const state = createFreshState();
		saveState(TEST_DIR, state);
		// tmp file should be gone after save
		expect(existsSync(join(TEST_DIR, ".po", "pipeline-state.json.tmp"))).toBe(false);
		expect(existsSync(join(TEST_DIR, ".po", "pipeline-state.json"))).toBe(true);
	});
});

describe("createFreshState", () => {
	it("starts at grill-me with empty issue list", () => {
		const state = createFreshState();
		expect(state.current_step).toBe("grill-me");
		expect(state.issues).toHaveLength(0);
		expect(state.steps_completed).toHaveLength(0);
		expect(state.pipeline_id).toMatch(/^[0-9a-f-]{36}$/);
	});
});
