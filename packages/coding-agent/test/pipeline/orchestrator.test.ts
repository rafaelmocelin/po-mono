import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Orchestrator } from "../../src/pipeline/orchestrator.js";

const TEST_DIR = join(tmpdir(), "po-orch-test-" + Date.now());

beforeEach(() => mkdirSync(TEST_DIR, { recursive: true }));
afterEach(() => rmSync(TEST_DIR, { recursive: true, force: true }));

describe("Orchestrator", () => {
	it("starts at grill-me and is active", () => {
		const orch = new Orchestrator(TEST_DIR);
		orch.start();
		expect(orch.currentStep).toBe("grill-me");
		expect(orch.isActive).toBe(true);
	});

	it("advances to write-a-prd after grill-me completes", () => {
		const orch = new Orchestrator(TEST_DIR);
		orch.start();
		orch.advance("docs/agent/grill-me-decisions.md", {
			input_tokens: 100,
			output_tokens: 50,
			model: "claude-opus-4-6",
			usd: 0.01,
		});
		expect(orch.currentStep).toBe("write-a-prd");
	});

	it("full pipeline sequence without design step", () => {
		const orch = new Orchestrator(TEST_DIR);
		orch.start(false);
		const steps = ["grill-me", "write-a-prd", "prd-to-issues", "tdd", "done"];
		for (let i = 0; i < 4; i++) {
			expect(orch.currentStep).toBe(steps[i]);
			orch.advance("artifact.md", { input_tokens: 0, output_tokens: 0, model: "x", usd: 0 });
		}
		expect(orch.currentStep).toBe("done");
		expect(orch.isActive).toBe(false);
	});

	it("includes design-an-interface when --design flag used", () => {
		const orch = new Orchestrator(TEST_DIR);
		orch.start(true);
		orch.advance("artifact.md", { input_tokens: 0, output_tokens: 0, model: "x", usd: 0 }); // grill-me
		orch.advance("artifact.md", { input_tokens: 0, output_tokens: 0, model: "x", usd: 0 }); // write-a-prd
		expect(orch.currentStep).toBe("design-an-interface");
	});

	it("jumpTo sets current step", () => {
		const orch = new Orchestrator(TEST_DIR);
		orch.start();
		orch.jumpTo("tdd");
		expect(orch.currentStep).toBe("tdd");
	});

	it("resume loads persisted state", () => {
		const orch1 = new Orchestrator(TEST_DIR);
		orch1.start();
		orch1.advance("artifact.md", { input_tokens: 0, output_tokens: 0, model: "x", usd: 0 });

		const orch2 = new Orchestrator(TEST_DIR);
		const state = orch2.resume();
		expect(state?.current_step).toBe("write-a-prd");
	});
});
