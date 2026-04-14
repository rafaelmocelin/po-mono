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

const SETTINGS_PATH = join(homedir(), ".po", "settings.json");

let _cachedSettings: PoSettings | null = null;

export function getPoSettings(): PoSettings {
	if (_cachedSettings) return _cachedSettings;
	if (existsSync(SETTINGS_PATH)) {
		_cachedSettings = JSON.parse(readFileSync(SETTINGS_PATH, "utf-8")) as PoSettings;
		return _cachedSettings;
	}
	_cachedSettings = defaultSettings();
	return _cachedSettings;
}

/** Invalidate settings cache (used after settings.json changes). */
export function invalidateSettingsCache(): void {
	_cachedSettings = null;
}

export function resolveModelId(tier: TierName): string {
	return getPoSettings().tiers[tier].models[0];
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
