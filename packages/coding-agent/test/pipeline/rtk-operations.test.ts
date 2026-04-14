import { beforeEach, describe, expect, it, vi } from "vitest";
import * as bashModule from "../../src/core/tools/bash.js";
import { createRtkBashOperations } from "../../src/pipeline/rtk-operations.js";

vi.mock("../../src/core/tools/bash.js");

describe("createRtkBashOperations", () => {
	let capturedCommands: string[];

	beforeEach(() => {
		capturedCommands = [];
		const mockLocal = {
			exec: async (command: string, _cwd: string, _opts: unknown) => {
				capturedCommands.push(command);
				return { exitCode: 0 };
			},
		};
		vi.mocked(bashModule.createLocalBashOperations).mockReturnValue(mockLocal as any);
	});

	it("prepends rtk to every command", async () => {
		const ops = createRtkBashOperations();
		await ops.exec("git status", "/tmp", { onData: () => {} });

		expect(capturedCommands[0]).toBe("rtk git status");
	});

	it("does NOT double-prepend if command already starts with rtk", async () => {
		const ops = createRtkBashOperations();
		await ops.exec("rtk git status", "/tmp", { onData: () => {} });

		expect(capturedCommands[0]).toBe("rtk git status");
	});
});
