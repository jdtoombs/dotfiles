/**
 * Permission-before-mutate Extension
 *
 * Asks for approval before any tool call that is not known to be read-only.
 * Choices:
 *   1. Approve - allow the tool call
 *   2. Deny - block the tool call
 *   3. Send new prompt - block the tool call, then send a steering prompt to the agent
 *   4. Ignore for session - allow this and future non-read-only tool calls until reload/session end
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const READ_ONLY_TOOLS = new Set([
	"read",
	"grep",
	"find",
	"ls",
	"web_search",
	"fetch_content",
	"get_search_content",
]);

type ToolSummary = {
	summary: string;
	details: string;
};

type PermissionChoice = "1. Approve" | "2. Deny" | "3. Send new prompt" | "4. Ignore for session";

const PERMISSION_CHOICES: Array<{ key: string; value: PermissionChoice; label: string }> = [
	{ key: "1", value: "1. Approve", label: "Approve" },
	{ key: "2", value: "2. Deny", label: "Deny" },
	{ key: "3", value: "3. Send new prompt", label: "Send new prompt" },
	{ key: "4", value: "4. Ignore for session", label: "Ignore for session" },
];

function asRecord(input: unknown): Record<string, unknown> | undefined {
	return input && typeof input === "object" ? (input as Record<string, unknown>) : undefined;
}

function shortToolName(toolName: string): string {
	return toolName.split(".").pop() ?? toolName;
}

function stringify(input: unknown): string {
	try {
		return JSON.stringify(input, null, 2);
	} catch {
		return String(input);
	}
}

function truncate(text: string, max = 2000): string {
	return text.length > max ? `${text.slice(0, max)}\n… truncated …` : text;
}

function indent(text: string, spaces = 2): string {
	const padding = " ".repeat(spaces);
	return text
		.split("\n")
		.map((line) => `${padding}${line}`)
		.join("\n");
}

function truncateToColumns(text: string, width: number): string {
	return text.length > width ? text.slice(0, Math.max(0, width - 1)) + "…" : text;
}

function wrapLine(line: string, width: number): string[] {
	if (line.length <= width) return [line];

	const lines: string[] = [];
	let remaining = line;
	while (remaining.length > width) {
		const breakAt = remaining.lastIndexOf(" ", width);
		const end = breakAt > Math.floor(width / 2) ? breakAt : width;
		lines.push(remaining.slice(0, end));
		remaining = remaining.slice(end).trimStart();
	}
	if (remaining) lines.push(remaining);
	return lines;
}

function isKey(data: string, key: "up" | "down" | "tab" | "enter" | "escape"): boolean {
	const keys: Record<typeof key, string[]> = {
		up: ["\x1b[A", "\x1bOA"],
		down: ["\x1b[B", "\x1bOB"],
		tab: ["\t"],
		enter: ["\r", "\n", "\r\n"],
		escape: ["\x1b"],
	};
	return keys[key].includes(data);
}

function preview(text: string, max = 160): string {
	const singleLine = text.replace(/\s+/g, " ").trim();
	const clipped = singleLine.length > max ? `${singleLine.slice(0, max)}…` : singleLine;
	return clipped ? JSON.stringify(clipped) : "<empty>";
}

function formatTextSize(text: string): string {
	const lines = text.length === 0 ? 0 : text.split("\n").length;
	return `${text.length} chars${lines > 1 ? `, ${lines} lines` : ""}`;
}

function summarizeEdit(input: Record<string, unknown>): ToolSummary {
	const path = typeof input.path === "string" ? input.path : "<unknown path>";
	const edits = Array.isArray(input.edits) ? input.edits : [];
	const editCount = edits.length;
	const editWord = editCount === 1 ? "edit" : "edits";
	const editDetails = edits
		.map((edit, index) => {
			const editRecord = asRecord(edit);
			const oldText = typeof editRecord?.oldText === "string" ? editRecord.oldText : "";
			const newText = typeof editRecord?.newText === "string" ? editRecord.newText : "";
			return [
				`${index + 1}. Replace ${formatTextSize(oldText)} with ${formatTextSize(newText)}`,
				`   old: ${preview(oldText)}`,
				`   new: ${preview(newText)}`,
			].join("\n");
		})
		.join("\n");

	return {
		summary: `Apply ${editCount} text replacement ${editWord} to ${path}.`,
		details: [`Path: ${path}`, editDetails && `Edits:\n${editDetails}`].filter(Boolean).join("\n"),
	};
}

function summarizeWrite(input: Record<string, unknown>): ToolSummary {
	const path = typeof input.path === "string" ? input.path : "<unknown path>";
	const content = typeof input.content === "string" ? input.content : undefined;
	return {
		summary: `Create or overwrite ${path}${content !== undefined ? ` with ${formatTextSize(content)}` : ""}.`,
		details: [
			`Path: ${path}`,
			content !== undefined && `Content preview: ${preview(content, 300)}`,
		].filter(Boolean).join("\n"),
	};
}

function summarizeBash(input: Record<string, unknown>): ToolSummary {
	const command = typeof input.command === "string" ? input.command : "<missing command>";
	const timeout = typeof input.timeout === "number" ? `\nTimeout: ${input.timeout}s` : "";
	return {
		summary: "Run a shell command.",
		details: `Command:\n${indent(command)}${timeout}`,
	};
}

function summarizeToolCall(toolName: string, input: unknown): ToolSummary {
	const name = shortToolName(toolName);
	const obj = asRecord(input);

	if (obj && (name === "bash" || typeof obj.command === "string")) {
		return summarizeBash(obj);
	}

	if (obj && name === "edit") return summarizeEdit(obj);
	if (obj && name === "write") return summarizeWrite(obj);

	if (obj && (toolName === "multi_tool_use.parallel" || name === "parallel") && Array.isArray(obj.tool_uses)) {
		const childSummaries = obj.tool_uses.map((toolUse, index) => {
			const toolUseRecord = asRecord(toolUse) ?? {};
			const childName = typeof toolUseRecord.recipient_name === "string"
				? toolUseRecord.recipient_name
				: `tool ${index + 1}`;
			const childInput = toolUseRecord.parameters;
			const childSummary = summarizeToolCall(childName, childInput);
			const childReadOnly = isReadOnlyToolCall(childName, childInput) ? "read-only" : "may mutate";
			return `${index + 1}. ${shortToolName(childName)} (${childReadOnly}) — ${childSummary.summary}\n${indent(childSummary.details, 4)}`;
		});
		const mutatingCount = obj.tool_uses.filter((toolUse) => {
			const toolUseRecord = asRecord(toolUse) ?? {};
			const childName = typeof toolUseRecord.recipient_name === "string" ? toolUseRecord.recipient_name : "";
			return !isReadOnlyToolCall(childName, toolUseRecord.parameters);
		}).length;

		return {
			summary: `Run ${obj.tool_uses.length} tool calls in parallel; ${mutatingCount} may mutate state.`,
			details: childSummaries.join("\n\n"),
		};
	}

	if (obj && typeof obj.path === "string") {
		return { summary: `Run ${toolName} on ${obj.path}.`, details: `Path: ${obj.path}` };
	}

	if (obj && typeof obj.query === "string") {
		return { summary: `Run ${toolName} for query ${preview(obj.query)}.`, details: `Query: ${obj.query}` };
	}

	return {
		summary: `Run ${toolName}.`,
		details: stringify(input),
	};
}

function isReadOnlyToolCall(toolName: string, input: unknown): boolean {
	const name = shortToolName(toolName);
	if (READ_ONLY_TOOLS.has(name)) return true;

	const obj = asRecord(input);
	if (!obj || !(toolName === "multi_tool_use.parallel" || name === "parallel")) return false;
	if (!Array.isArray(obj.tool_uses)) return false;

	return obj.tool_uses.every((toolUse) => {
		const toolUseRecord = asRecord(toolUse) ?? {};
		const childName = typeof toolUseRecord.recipient_name === "string" ? toolUseRecord.recipient_name : "";
		return isReadOnlyToolCall(childName, toolUseRecord.parameters);
	});
}

function formatApprovalMessage(toolName: string, input: unknown): string {
	const { summary, details } = summarizeToolCall(toolName, input);
	return truncate(
		[
			"Permission required",
			`Tool: ${toolName}`,
			`Summary: ${summary}`,
			details && `Details:\n${details}`,
			"What do you want to do?",
		].filter(Boolean).join("\n\n"),
	);
}

async function choosePermissionAction(
	ctx: ExtensionContext,
	message: string,
): Promise<PermissionChoice | undefined> {
	if (ctx.mode !== "tui") {
		return ctx.ui.select(
			message,
			PERMISSION_CHOICES.map((choice) => choice.value),
		) as Promise<PermissionChoice | undefined>;
	}

	return ctx.ui.custom<PermissionChoice | undefined>((tui, theme, _keybindings, done) => {
		let selectedIndex = 0;

		const select = (index: number) => done(PERMISSION_CHOICES[index]?.value);

		return {
			handleInput(data: string): void {
				const directIndex = PERMISSION_CHOICES.findIndex((choice) => data === choice.key);
				if (directIndex >= 0) {
					select(directIndex);
					return;
				}

				if (isKey(data, "up")) {
					selectedIndex = Math.max(0, selectedIndex - 1);
					tui.requestRender();
					return;
				}

				if (isKey(data, "down") || isKey(data, "tab")) {
					selectedIndex = Math.min(PERMISSION_CHOICES.length - 1, selectedIndex + 1);
					tui.requestRender();
					return;
				}

				if (isKey(data, "enter")) {
					select(selectedIndex);
					return;
				}

				if (isKey(data, "escape")) {
					done(undefined);
				}
			},
			render(width: number): string[] {
				const contentWidth = Math.max(20, width - 4);
				const lines = message.split("\n").flatMap((line) =>
					line ? wrapLine(line, contentWidth) : [""],
				);
				const visibleMessageLines = lines.length > 30
					? [...lines.slice(0, 30), "… truncated …"]
					: lines;
				const optionLines = PERMISSION_CHOICES.map((choice, index) => {
					const prefix = index === selectedIndex ? "› " : "  ";
					const option = truncateToColumns(`${prefix}[${choice.key}] ${choice.label}`, contentWidth);
					return index === selectedIndex
						? theme.bg("selectedBg", theme.fg("accent", option))
						: option;
				});

				return [
					theme.fg("warning", theme.bold("Permission required")),
					...visibleMessageLines.slice(1),
					"",
					...optionLines,
					"",
					theme.fg("dim", "Press 1/2/3/4, ↑↓ + Enter, or Esc to cancel"),
				];
			},
			invalidate(): void {},
		};
	}, {
		overlay: true,
		overlayOptions: { width: "80%", minWidth: 50, maxHeight: "80%" },
	});
}

export default function (pi: ExtensionAPI) {
	let ignoreForSession = false;

	pi.on("tool_call", async (event, ctx) => {
		if (ignoreForSession || isReadOnlyToolCall(event.toolName, event.input)) return undefined;

		if (!ctx.hasUI) {
			return {
				block: true,
				reason: `Blocked non-read-only tool ${event.toolName}: no UI available for approval`,
			};
		}

		const choice = await choosePermissionAction(ctx, formatApprovalMessage(event.toolName, event.input));

		if (choice === "1. Approve") return undefined;

		if (choice === "4. Ignore for session") {
			ignoreForSession = true;
			ctx.ui.notify("Permission prompts disabled for this session", "warning");
			return undefined;
		}

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
