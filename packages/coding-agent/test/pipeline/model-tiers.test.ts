import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

describe("error handling", () => {
	let warnSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		invalidateSettingsCache();
		// Mock console.warn to verify warnings are logged
		warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("handles malformed JSON and falls back to defaults", () => {
		// Create a temporary directory structure that mimics ~/.po/
		const fs = require("node:fs");
		const path = require("node:path");
		const os = require("node:os");

		const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "po-test-"));
		const poDir = path.join(tempHome, ".po");
		fs.mkdirSync(poDir, { recursive: true });
		const settingsPath = path.join(poDir, "settings.json");
		fs.writeFileSync(settingsPath, "{invalid json}");

		// Temporarily override home dir
		const originalHome = process.env.HOME;
		process.env.HOME = tempHome;

		try {
			invalidateSettingsCache(); // Clear cache after changing HOME
			const settings = getPoSettings();
			expect(settings.tiers.tier1.models[0]).toBe("claude-opus-4-6");
			expect(warnSpy).toHaveBeenCalled();
		} finally {
			if (originalHome) process.env.HOME = originalHome;
			fs.rmSync(tempHome, { recursive: true, force: true });
		}
	});

	it("handles missing required fields in settings", () => {
		const fs = require("node:fs");
		const path = require("node:path");
		const os = require("node:os");

		const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "po-test-"));
		const poDir = path.join(tempHome, ".po");
		fs.mkdirSync(poDir, { recursive: true });
		const settingsPath = path.join(poDir, "settings.json");

		// Missing escalation field
		fs.writeFileSync(
			settingsPath,
			JSON.stringify({
				tiers: {
					tier1: { role: "planning", models: ["claude-opus-4-6"] },
					tier2: { role: "implementation", models: ["claude-sonnet-4-6"] },
					tier3: { role: "mechanical", models: ["claude-haiku-4-5"] },
				},
			}),
		);

		const originalHome = process.env.HOME;
		process.env.HOME = tempHome;

		try {
			invalidateSettingsCache(); // Clear cache after changing HOME
			const settings = getPoSettings();
			expect(settings.tiers.tier1.models[0]).toBe("claude-opus-4-6");
			expect(warnSpy).toHaveBeenCalled();
		} finally {
			if (originalHome) process.env.HOME = originalHome;
			fs.rmSync(tempHome, { recursive: true, force: true });
		}
	});

	it("handles empty models array in settings", () => {
		const fs = require("node:fs");
		const path = require("node:path");
		const os = require("node:os");

		const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "po-test-"));
		const poDir = path.join(tempHome, ".po");
		fs.mkdirSync(poDir, { recursive: true });
		const settingsPath = path.join(poDir, "settings.json");

		fs.writeFileSync(
			settingsPath,
			JSON.stringify({
				tiers: {
					tier1: { role: "planning", models: [] },
					tier2: { role: "implementation", models: ["claude-sonnet-4-6"] },
					tier3: { role: "mechanical", models: ["claude-haiku-4-5"] },
				},
				escalation: {
					tier2_max_attempts: 3,
					tier1_max_attempts: 2,
				},
			}),
		);

		const originalHome = process.env.HOME;
		process.env.HOME = tempHome;

		try {
			invalidateSettingsCache(); // Clear cache after changing HOME
			const settings = getPoSettings();
			expect(settings.tiers.tier1.models[0]).toBe("claude-opus-4-6");
			expect(warnSpy).toHaveBeenCalled();
		} finally {
			if (originalHome) process.env.HOME = originalHome;
			fs.rmSync(tempHome, { recursive: true, force: true });
		}
	});

	it("resolveModelId returns first model when settings are valid", () => {
		const settings = getPoSettings();
		expect(settings.tiers.tier1.models.length).toBeGreaterThan(0);
		expect(resolveModelId("tier1")).toBe(settings.tiers.tier1.models[0]);
	});
});
