import { type BashOperations, createLocalBashOperations } from "../core/tools/bash.js";

/**
 * BashOperations implementation that transparently routes all commands through RTK.
 * RTK provides 60-90% token savings on common dev operations by filtering output.
 *
 * Commands already prefixed with "rtk" are passed through unchanged to avoid double-wrapping.
 */
export function createRtkBashOperations(): BashOperations {
	const local = createLocalBashOperations();
	return {
		exec: (command, cwd, options) => {
			const rtkCommand = command.startsWith("rtk ") ? command : `rtk ${command}`;
			return local.exec(rtkCommand, cwd, options);
		},
	};
}
