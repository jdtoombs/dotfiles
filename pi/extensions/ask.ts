import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const ASK_PROVIDER = "github-copilot";
const ASK_MODEL = "gpt-5.3-codex";
const ASK_MODEL_LABEL = `${ASK_PROVIDER}/${ASK_MODEL}`;
const ASK_THINKING_LEVEL = "high" as const;

function buildAskPrompt(question: string): string {
	return `You are answering a repo/code question about the current project.

User question:
${question}

Response style:
- Be balanced and concise: direct answer first, then the useful details.
- Prefer short bullets over long paragraphs.
- Include relevant file paths, functions, classes, routes, or modules when they matter.
- If you need context, inspect the repo with targeted reads/searches before answering.
- Do not make code changes unless the user explicitly asks for changes.
- If evidence is incomplete, say what you verified and what remains uncertain.

Suggested structure when useful:
1. Short answer
2. How it works / flow
3. Key files to inspect
4. Caveats or follow-ups`;
}

export default function askExtension(pi: ExtensionAPI) {
	let askInFlight = false;
	let previousModel: Parameters<typeof pi.setModel>[0] | undefined;
	let previousThinkingLevel: ReturnType<typeof pi.getThinkingLevel> | undefined;

	async function restorePreviousModel(ctx: { ui: { notify: (message: string, level: "info" | "warning" | "error") => void } }) {
		if (!askInFlight) return;

		const modelToRestore = previousModel;
		const thinkingToRestore = previousThinkingLevel;

		askInFlight = false;
		previousModel = undefined;
		previousThinkingLevel = undefined;

		if (modelToRestore) {
			const restored = await pi.setModel(modelToRestore);
			if (!restored) {
				ctx.ui.notify("/ask finished, but Pi could not restore the previous model auth.", "warning");
				return;
			}
		}

		if (thinkingToRestore) {
			pi.setThinkingLevel(thinkingToRestore);
		}

		ctx.ui.notify("/ask finished; restored previous model.", "info");
	}

	pi.registerCommand("ask", {
		description: `Ask a concise repo/code question using ${ASK_MODEL_LABEL} for one turn`,
		handler: async (args, ctx) => {
			const question = args.trim();
			if (!question) {
				ctx.ui.notify("Usage: /ask <repo or code question>", "warning");
				return;
			}

			if (!ctx.isIdle()) {
				ctx.ui.notify("/ask can only start while Pi is idle. Wait for the current turn to finish.", "warning");
				return;
			}

			const askModel = ctx.modelRegistry.find(ASK_PROVIDER, ASK_MODEL);
			if (!askModel) {
				ctx.ui.notify(`Could not find model ${ASK_MODEL_LABEL}.`, "error");
				return;
			}

			previousModel = ctx.model;
			previousThinkingLevel = pi.getThinkingLevel();
			askInFlight = true;

			const switched = await pi.setModel(askModel);
			if (!switched) {
				askInFlight = false;
				previousModel = undefined;
				previousThinkingLevel = undefined;
				ctx.ui.notify(`Could not switch to ${ASK_MODEL_LABEL}; check GitHub Copilot auth.`, "error");
				return;
			}

			pi.setThinkingLevel(ASK_THINKING_LEVEL);
			ctx.ui.notify(`Using ${ASK_MODEL_LABEL} for this /ask question.`, "info");

			try {
				pi.sendUserMessage(buildAskPrompt(question));
			} catch (error) {
				await restorePreviousModel(ctx);
				ctx.ui.notify(`/ask failed to send: ${error instanceof Error ? error.message : String(error)}`, "error");
			}
		},
	});

	pi.on("agent_settled", async (_event, ctx) => {
		await restorePreviousModel(ctx);
	});
}
