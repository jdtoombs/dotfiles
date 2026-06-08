import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, openSync, closeSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

interface RegisteredAgent {
  pid: number;
  cwd: string;
  status: "idle" | "working";
  updatedAt: number;
  startedAt: number;
  sessionFile?: string;
  sessionName?: string;
  model?: string;
  tmux?: {
    paneId?: string;
    sessionName?: string;
    windowIndex?: string;
    windowName?: string;
    paneIndex?: string;
  };
}

type AgentRegistry = Record<string, RegisteredAgent>;

const AGENT_DIR = process.env.PI_CODING_AGENT_DIR || join(process.env.HOME || ".", ".pi", "agent");
const RUNTIME_DIR = join(AGENT_DIR, "runtime");
const REGISTRY_PATH = join(RUNTIME_DIR, "agents.json");
const LOCK_PATH = join(RUNTIME_DIR, "agents.json.lock");
const HEARTBEAT_MS = 5_000;
const STALE_MS = 30_000;
const LOCK_TIMEOUT_MS = 2_000;

let lastSnapshot: RegisteredAgent | undefined;
let heartbeat: NodeJS.Timeout | undefined;

function ensureRuntimeDir(): void {
  mkdirSync(RUNTIME_DIR, { recursive: true });
}

function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function withRegistryLock<T>(fn: () => T): T {
  ensureRuntimeDir();
  const started = Date.now();

  while (true) {
    try {
      const fd = openSync(LOCK_PATH, "wx");
      try {
        return fn();
      } finally {
        closeSync(fd);
        rmSync(LOCK_PATH, { force: true });
      }
    } catch (error: any) {
      if (error?.code !== "EEXIST") throw error;
      if (Date.now() - started > LOCK_TIMEOUT_MS) {
        rmSync(LOCK_PATH, { force: true });
        continue;
      }
      sleepSync(25);
    }
  }
}

function readRegistry(): AgentRegistry {
  if (!existsSync(REGISTRY_PATH)) return {};
  try {
    return JSON.parse(readFileSync(REGISTRY_PATH, "utf8")) as AgentRegistry;
  } catch {
    return {};
  }
}

function writeRegistry(registry: AgentRegistry): void {
  ensureRuntimeDir();
  const tmp = `${REGISTRY_PATH}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(registry, null, 2)}\n`);
  renameSync(tmp, REGISTRY_PATH);
}

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function pruneRegistry(registry: AgentRegistry): AgentRegistry {
  const now = Date.now();
  return Object.fromEntries(
    Object.entries(registry).filter(([, agent]) =>
      Number.isFinite(agent.pid) && isPidAlive(agent.pid) && now - agent.updatedAt <= STALE_MS,
    ),
  );
}

function getTmuxInfo(): RegisteredAgent["tmux"] | undefined {
  if (!process.env.TMUX) return undefined;
  try {
    const args = ["display-message", "-p"];
    if (process.env.TMUX_PANE) args.push("-t", process.env.TMUX_PANE);
    args.push("#{pane_id}\t#{session_name}\t#{window_index}\t#{window_name}\t#{pane_index}");

    const value = execFileSync("tmux", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const [paneId, sessionName, windowIndex, windowName, paneIndex] = value.split("\t");
    return { paneId, sessionName, windowIndex, windowName, paneIndex };
  } catch {
    return undefined;
  }
}

function modelLabel(ctx: ExtensionContext): string | undefined {
  const model = ctx.model;
  if (!model) return undefined;
  return `${model.provider}/${model.id}`;
}

function buildSnapshot(pi: ExtensionAPI, ctx: ExtensionContext, status: RegisteredAgent["status"]): RegisteredAgent {
  return {
    pid: process.pid,
    cwd: ctx.cwd,
    status,
    updatedAt: Date.now(),
    startedAt: lastSnapshot?.startedAt ?? Date.now(),
    sessionFile: ctx.sessionManager.getSessionFile(),
    sessionName: pi.getSessionName?.(),
    model: modelLabel(ctx),
    tmux: getTmuxInfo(),
  };
}

function saveSnapshot(snapshot: RegisteredAgent): void {
  lastSnapshot = snapshot;
  withRegistryLock(() => {
    const registry = pruneRegistry(readRegistry());
    registry[String(process.pid)] = snapshot;
    writeRegistry(registry);
  });
}

function removeSnapshot(): void {
  withRegistryLock(() => {
    const registry = readRegistry();
    delete registry[String(process.pid)];
    writeRegistry(pruneRegistry(registry));
  });
}

function update(pi: ExtensionAPI, ctx: ExtensionContext, status: RegisteredAgent["status"]): void {
  saveSnapshot(buildSnapshot(pi, ctx, status));
}

function formatAgent(agent: RegisteredAgent): string {
  const tmuxTarget = agent.tmux?.paneId
    ? `${agent.tmux.sessionName ?? "?"}:${agent.tmux.windowIndex ?? "?"}.${agent.tmux.paneIndex ?? "?"} ${agent.tmux.paneId}`
    : "not in tmux";
  const title = agent.sessionName || agent.cwd.split("/").filter(Boolean).at(-1) || agent.cwd;
  const model = agent.model ? ` • ${agent.model}` : "";
  return `${agent.status.padEnd(7)} ${title} • pid ${agent.pid} • ${tmuxTarget}${model}`;
}

function switchToAgent(agent: RegisteredAgent): void {
  if (!agent.tmux?.paneId) throw new Error("Selected agent is not running inside tmux");
  if (agent.tmux.sessionName) execFileSync("tmux", ["switch-client", "-t", agent.tmux.sessionName], { stdio: "ignore" });
  if (agent.tmux.sessionName && agent.tmux.windowIndex) {
    execFileSync("tmux", ["select-window", "-t", `${agent.tmux.sessionName}:${agent.tmux.windowIndex}`], { stdio: "ignore" });
  }
  execFileSync("tmux", ["select-pane", "-t", agent.tmux.paneId], { stdio: "ignore" });
}

export default function agentRegistry(pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    update(pi, ctx, "idle");

    if (!heartbeat) {
      heartbeat = setInterval(() => {
        if (!lastSnapshot) return;
        saveSnapshot({ ...lastSnapshot, updatedAt: Date.now(), tmux: getTmuxInfo() });
      }, HEARTBEAT_MS);
      heartbeat.unref?.();
    }
  });

  pi.on("model_select", async (_event, ctx) => update(pi, ctx, lastSnapshot?.status ?? "idle"));
  pi.on("agent_start", async (_event, ctx) => update(pi, ctx, "working"));
  pi.on("agent_end", async (_event, ctx) => update(pi, ctx, "idle"));

  pi.on("session_shutdown", async () => {
    if (heartbeat) clearInterval(heartbeat);
    heartbeat = undefined;
    removeSnapshot();
  });

  pi.registerCommand("agents", {
    description: "Pick a running pi agent and jump to its tmux pane",
    handler: async (_args, ctx) => {
      if (!process.env.TMUX) {
        ctx.ui.notify("/agents only works from inside tmux", "error");
        return;
      }

      const registry = withRegistryLock(() => {
        const pruned = pruneRegistry(readRegistry());
        writeRegistry(pruned);
        return pruned;
      });
      const agents = Object.values(registry).sort((a, b) => b.updatedAt - a.updatedAt);

      if (agents.length === 0) {
        ctx.ui.notify(`No active pi agents found in ${REGISTRY_PATH}`, "info");
        return;
      }

      const labels = agents.map(formatAgent);
      const selected = await ctx.ui.select("Running pi agents", labels);
      if (!selected) return;

      const agent = agents[labels.indexOf(selected)];
      if (!agent) return;

      try {
        switchToAgent(agent);
      } catch (error: any) {
        ctx.ui.notify(`Could not switch tmux pane: ${error?.message ?? String(error)}`, "error");
      }
    },
  });

  pi.registerCommand("agent-registry", {
    description: "Show the pi agent registry file used by the tmux dashboard",
    handler: async (_args, ctx) => {
      const registry = withRegistryLock(() => {
        const pruned = pruneRegistry(readRegistry());
        writeRegistry(pruned);
        return pruned;
      });
      ctx.ui.notify(`${Object.keys(registry).length} active pi agent(s): ${REGISTRY_PATH}`, "info");
    },
  });
}
