import type { StepCost } from "./state.js";

/** Token pricing per million tokens (USD). Update when Anthropic changes pricing. */
const TOKEN_RATES: Record<string, { input: number; output: number }> = {
	"claude-opus-4-6": { input: 15.0, output: 75.0 },
	"claude-sonnet-4-6": { input: 3.0, output: 15.0 },
	"claude-haiku-4-5": { input: 0.8, output: 4.0 },
	"gpt-4.1": { input: 2.0, output: 8.0 },
	"gpt-4.1-mini": { input: 0.4, output: 1.6 },
	"gemini-2.5-pro": { input: 1.25, output: 10.0 },
	"gemini-2.5-flash": { input: 0.15, output: 0.6 },
	"gemini-2.5-flash-lite": { input: 0.075, output: 0.3 },
};

export function calculateCost(inputTokens: number, outputTokens: number, modelId: string): number {
	const rates = TOKEN_RATES[modelId];
	if (!rates) return 0;
	return (inputTokens / 1_000_000) * rates.input + (outputTokens / 1_000_000) * rates.output;
}

export function buildStepCost(inputTokens: number, outputTokens: number, modelId: string): StepCost {
	return {
		input_tokens: inputTokens,
		output_tokens: outputTokens,
		model: modelId,
		usd: calculateCost(inputTokens, outputTokens, modelId),
	};
}

/** Render /costs table output from pipeline state. */
export function renderCostsTable(state: import("./state.js").PipelineState): string {
	const header = `Pipeline: ${state.pipeline_id.slice(0, 8)} | Total: $${state.steps_completed
		.reduce((s, c) => s + c.cost.usd, 0)
		.toFixed(2)}\n`;
	const line = `${"─".repeat(73)}\n`;
	const col = (s: string, w: number) => s.slice(0, w).padEnd(w);

	const rows = state.steps_completed.map((s) => {
		const model = s.cost.model.replace("claude-", "").replace("-4-6", "-4.6").replace("-4-5", "-4.5");
		return (
			col(s.step, 22) +
			col(model, 16) +
			col(`${(s.cost.input_tokens / 1000).toFixed(1)}k`, 9) +
			col(`${(s.cost.output_tokens / 1000).toFixed(1)}k`, 9) +
			col("—", 13) +
			`$${s.cost.usd.toFixed(2)}`
		);
	});

	return (
		header +
		"\n" +
		col("Step", 22) +
		col("Model", 16) +
		col("Input", 9) +
		col("Output", 9) +
		col("Escalations", 13) +
		"Cost\n" +
		line +
		rows.join("\n")
	);
}
