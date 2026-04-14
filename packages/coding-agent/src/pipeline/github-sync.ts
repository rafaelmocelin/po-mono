import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface GithubIssue {
	number: number;
	title: string;
	state: "open" | "closed";
	labels: Array<{ name: string }>;
}

/**
 * Sync local issue cache with GitHub Issues state.
 * GitHub is source of truth — local changes are overwritten.
 * Runs gh issue list and updates local .md cache files.
 */
export function syncIssuesFromGithub(cwd: string): void {
	let issues: GithubIssue[];
	try {
		const output = execSync("gh issue list --json number,title,state,labels --limit 200", {
			cwd,
			encoding: "utf-8",
		});
		issues = JSON.parse(output) as GithubIssue[];
	} catch {
		// gh not available or no remote — skip sync silently
		return;
	}

	const issuesDir = join(cwd, "docs", "agent", "issues");
	if (!existsSync(issuesDir)) return;

	const files = readdirSync(issuesDir).filter((f) => f.endsWith(".md"));

	for (const file of files) {
		const filePath = join(issuesDir, file);
		const content = readFileSync(filePath, "utf-8");
		const match = content.match(/^---\n([\s\S]*?)\n---/);
		if (!match) continue;

		const ghNumMatch = match[1].match(/github_issue:\s*(\d+)/);
		if (!ghNumMatch) continue;

		const ghNum = parseInt(ghNumMatch[1], 10);
		const ghIssue = issues.find((i) => i.number === ghNum);
		if (!ghIssue) continue;

		const newStatus = ghIssue.state === "closed" ? "done" : readStatusFromFrontmatter(match[1]);
		const updated = content.replace(/^(---\n[\s\S]*?\nstatus:)\s*\S+/m, `$1 ${newStatus}`);
		writeFileSync(filePath, updated, "utf-8");
	}
}

function readStatusFromFrontmatter(fm: string): string {
	const m = fm.match(/status:\s*(\S+)/);
	return m ? m[1] : "backlog";
}
