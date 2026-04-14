import { beforeEach, describe, expect, it } from "vitest";
import { getPoSettings, invalidateSettingsCache, nextModelId, resolveModelId } from "../../src/pipeline/model-tiers.js";

describe("resolveModelId", () => {
	it("returns the first model in tier1", () => {
		expect(resolveModelId("tier1")).toBe("claude-opus-4-6");
	});

	it("returns the first model in tier2", () => {
		expect(resolveModelId("tier2")).toBe("claude-sonnet-4-6");
	});

	it("returns the first model in tier3", () => {
		expect(resolveModelId("tier3")).toBe("claude-haiku-4-5");
	});
});

describe("nextModelId", () => {
	it("returns next model in chain on 429", () => {
		expect(nextModelId("tier2", "claude-sonnet-4-6")).toBe("gpt-4.1");
	});

	it("returns null when at end of chain", () => {
		expect(nextModelId("tier2", "gemini-2.5-flash")).toBeNull();
	});

	it("returns null when model not in tier", () => {
		expect(nextModelId("tier2", "unknown-model")).toBeNull();
	});
});

describe("getPoSettings", () => {
	beforeEach(() => {
		// Clear cache before each test
		invalidateSettingsCache();
	});

	it("returns default settings when no settings.json exists", () => {
		const settings = getPoSettings();
		expect(settings.tiers.tier1.models[0]).toBe("claude-opus-4-6");
		expect(settings.escalation.tier2_max_attempts).toBe(3);
	});

	it("returns cached settings on subsequent calls", () => {
		const settings1 = getPoSettings();
		const settings2 = getPoSettings();
		expect(settings1).toBe(settings2);
	});
});
