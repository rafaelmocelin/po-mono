import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface TierConfig {
	role: string;
	models: string[];
}

export interface PoSettings {
	tiers: {
		tier1: TierConfig;
		tier2: TierConfig;
		tier3: TierConfig;
	};
	escalation: {
		tier2_max_attempts: number;
		tier1_max_attempts: number;
	};
}

export type TierName = "tier1" | "tier2" | "tier3";

let _cachedSettings: PoSettings | null = null;

function getSettingsPath(): string {
	return join(homedir(), ".po", "settings.json");
}

function validatePoSettings(data: unknown): data is PoSettings {
	if (!data || typeof data !== "object") return false;

	const obj = data as Record<string, unknown>;

	// Validate tiers structure
	if (!obj.tiers || typeof obj.tiers !== "object") return false;
	const tiers = obj.tiers as Record<string, unknown>;

	// Check that all required tiers exist with valid models arrays
	for (const tierName of ["tier1", "tier2", "tier3"]) {
		const tier = tiers[tierName];
		if (!tier || typeof tier !== "object") return false;
		const tierObj = tier as Record<string, unknown>;
		if (!Array.isArray(tierObj.models) || tierObj.models.length === 0) return false;
		if (typeof tierObj.role !== "string") return false;
	}

	// Validate escalation structure
	if (!obj.escalation || typeof obj.escalation !== "object") return false;
	const escalation = obj.escalation as Record<string, unknown>;
	if (typeof escalation.tier2_max_attempts !== "number") return false;
	if (typeof escalation.tier1_max_attempts !== "number") return false;

	return true;
}

export function getPoSettings(): PoSettings {
	if (_cachedSettings) return _cachedSettings;
	const settingsPath = getSettingsPath();
	if (existsSync(settingsPath)) {
		try {
			const rawData = JSON.parse(readFileSync(settingsPath, "utf-8"));
			if (validatePoSettings(rawData)) {
				_cachedSettings = rawData;
				return _cachedSettings;
			} else {
				console.warn(`Settings file at ${settingsPath} failed validation, falling back to defaults`);
			}
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			console.warn(`Failed to parse settings file at ${settingsPath}: ${msg}, falling back to defaults`);
		}
	}
	_cachedSettings = defaultSettings();
	return _cachedSettings;
}

/** Invalidate settings cache (used after settings.json changes). */
export function invalidateSettingsCache(): void {
	_cachedSettings = null;
}

export function resolveModelId(tier: TierName): string {
	const models = getPoSettings().tiers[tier].models;
	if (models.length === 0) {
		throw new Error(`No models configured for ${tier}`);
	}
	return models[0];
}

/**
 * Returns the next model ID to try after a 429 on `currentId`.
 * Returns null if currentId is last in chain or not found.
 */
export function nextModelId(tier: TierName, currentId: string): string | null {
	const models = getPoSettings().tiers[tier].models;
	const idx = models.indexOf(currentId);
	if (idx === -1 || idx === models.length - 1) return null;
	return models[idx + 1];
}

function defaultSettings(): PoSettings {
	return {
		tiers: {
			tier1: {
				role: "planning",
				models: ["claude-opus-4-6", "o3", "gemini-2.5-pro"],
			},
			tier2: {
				role: "implementation",
				models: ["claude-sonnet-4-6", "gpt-4.1", "gemini-2.5-flash"],
			},
			tier3: {
				role: "mechanical",
				models: ["claude-haiku-4-5", "gpt-4.1-mini", "gemini-2.5-flash-lite"],
			},
		},
		escalation: {
			tier2_max_attempts: 3,
			tier1_max_attempts: 2,
		},
	};
}
