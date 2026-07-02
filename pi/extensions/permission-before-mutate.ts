/**
 * Permission-before-mutate Extension
 *
 * Asks for approval before any tool call that is not known to be read-only.
 * Choices:
 *   1. Approve - allow the tool call
 *   2. Deny - block the tool call
 *   3. Send new prompt - block the tool call, then send a steering prompt to the agent
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const READ_ONLY_TOOLS = new Set([
	"read",
	"grep",
	"find",
	"ls",
	"web_search",
	"fetch_content",
	"get_search_content",
]);

function summarizeInput(input: unknown): string {
	if (!input || typeof input !== "object") return String(input ?? "");

	const obj = input as Record<string, unknown>;

	if (typeof obj.command === "string") return obj.command;
	if (typeof obj.path === "string") return obj.path;
	if (typeof obj.query === "string") return obj.query;

	try {
		return JSON.stringify(input, null, 2);
	} catch {
		return String(input);
	}
}

function truncate(text: string, max = 2000): string {
	return text.length > max ? `${text.slice(0, max)}\n… truncated …` : text;
}

export default function (pi: ExtensionAPI) {
	pi.on("tool_call", async (event, ctx) => {
		if (READ_ONLY_TOOLS.has(event.toolName)) return undefined;

		if (!ctx.hasUI) {
			return {
				block: true,
				reason: `Blocked non-read-only tool ${event.toolName}: no UI available for approval`,
			};
		}

		const details = truncate(summarizeInput(event.input));
		const choice = await ctx.ui.select(
			`Permission required\n\nTool: ${event.toolName}\n\n${details}\n\nWhat do you want to do?`,
			["1. Approve", "2. Deny", "3. Send new prompt"],
		);

		if (choice === "1. Approve") return undefined;

		if (choice === "3. Send new prompt") {
			const prompt = await ctx.ui.input(
				"New prompt",
				"Tell pi what to do instead of this tool call...",
			);

			if (prompt?.trim()) {
				pi.sendUserMessage(prompt.trim(), { deliverAs: "steer" });
			}

			return { block: true, reason: "Blocked by user; replacement prompt sent" };
		}

		return { block: true, reason: "Blocked by user" };
	});
}
