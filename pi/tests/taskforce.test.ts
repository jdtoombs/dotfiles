import assert from "node:assert/strict";
import { test } from "node:test";
import taskforce, { buildWorkflow } from "../extensions/taskforce.ts";

const RPC = "subagents:rpc:v1:";
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

async function workflow(prompt: string, overrides: Record<string, unknown> = {}) {
  const calls: any[] = [];
  const result = await new AsyncFunction("runs", buildWorkflow(prompt))({
    async run(key: string, params: any) {
      calls.push({ key, ...params });
      return overrides[key] ?? {
        ok: true,
        structuredOutput: { verdict: { scout: "ready", worker: "implemented", reviewer: "ok" }[key], report: `${key} evidence` },
      };
    },
  });
  return { calls, result };
}

function harness(options: { approve?: boolean; hasUI?: boolean; respond?: (request: any) => any } = {}) {
  const listeners = new Map<string, Set<(payload: any) => void>>();
  const events = {
    on(name: string, callback: (payload: any) => void) {
      const callbacks = listeners.get(name) ?? new Set();
      callbacks.add(callback);
      listeners.set(name, callbacks);
      return () => { callbacks.delete(callback); if (!callbacks.size) listeners.delete(name); };
    },
    emit(name: string, payload: any) {
      for (const callback of [...(listeners.get(name) ?? [])]) callback(payload);
    },
  };
  const hooks: Record<string, Function> = {};
  const commands: Record<string, any> = {};
  const entries: any[] = [];
  const requests: any[] = [];
  const notices: any[] = [];
  const messages: any[] = [];
  const confirmations: any[] = [];
  const pi = {
    events,
    on(name: string, callback: Function) { hooks[name] = callback; },
    registerCommand(name: string, command: any) { commands[name] = command; },
    appendEntry(customType: string, data: any) { entries.push({ type: "custom", customType, data }); },
    sendMessage(message: any, flags: any) { messages.push({ message, flags }); },
  };
  const ctx = {
    cwd: "/disposable/repo",
    hasUI: options.hasUI ?? true,
    async waitForIdle() {},
    sessionManager: { getEntries: () => entries, getBranch: () => [] },
    ui: {
      notify(message: string, level: string) { notices.push({ message, level }); },
      async confirm(...args: any[]) { confirmations.push(args); return options.approve ?? true; },
    },
  };
  events.on(`${RPC}request`, (request) => {
    requests.push(request);
    const response = options.respond ? options.respond(request) : {
      success: true,
      data: request.method === "ping"
        ? { capabilities: { asyncSpawn: true } }
        : request.method === "spawn" ? { details: { asyncId: "run-1" } } : { details: {} },
    };
    if (response !== undefined) events.emit(`${RPC}reply:${request.requestId}`, { version: 1, requestId: request.requestId, ...response });
  });
  taskforce(pi as any);
  hooks.session_start({}, ctx);
  return {
    ctx, hooks, events, listeners, commands, entries, requests, notices, messages, confirmations,
    run: (prompt = "fix bug") => commands.tf.handler(prompt, ctx),
    shutdown: () => hooks.session_shutdown(),
    replyListeners: () => [...listeners.keys()].filter(name => name.startsWith(`${RPC}reply:`)),
  };
}

const ping = { success: true, data: { capabilities: { asyncSpawn: true } } };
const started = { success: true, data: { details: { asyncId: "run-1" } } };
const terminal = (state = "completed", proof = "observed") => ({
  success: true,
  data: { details: { workflowChildren: { workflowState: state }, workflowTerminalProof: { state: proof, dispatchClosed: true } } },
});

test("workflow runs three fresh stages in order with safe original-request and evidence handoffs", async () => {
  const prompt = 'fix `x` ${globalThis.hacked = true} "; throw Error("injected"); //\n```\n\\';
  const { calls, result } = await workflow(prompt);
  assert.deepEqual(calls.map(call => call.key), ["scout", "worker", "reviewer"]);
  for (const call of calls) {
    assert.equal(call.context, "fresh");
    assert.equal(call.async, undefined);
    assert.equal(call.model, undefined);
    assert.ok(call.task.includes(prompt));
    assert.ok(call.label);
    assert.ok(call.output.endsWith(".json"));
  }
  assert.ok(calls[1].task.includes("scout evidence"));
  assert.ok(calls[2].task.includes("scout evidence"));
  assert.ok(calls[2].task.includes("worker evidence"));
  assert.equal(calls[1].acceptance.level, "checked");
  assert.equal(calls[1].acceptance.review.required, false);
  assert.equal(result.status, "reviewed");
  assert.equal((globalThis as any).hacked, undefined);
});

for (const stage of ["scout", "worker", "reviewer"]) {
  for (const failure of [
    { ok: false, error: "provider failed" },
    { ok: true, stopped: true },
    { ok: true, detached: true },
    { ok: true, interrupted: true },
    { ok: false, state: "running" },
    { ok: true },
  ]) {
    test(`${stage} stops on ${JSON.stringify(failure)}`, async () => {
      const calls: string[] = [];
      await assert.rejects(new AsyncFunction("runs", buildWorkflow("fix bug"))({
        async run(key: string) {
          calls.push(key);
          return key === stage ? failure : {
            ok: true, structuredOutput: { verdict: key === "scout" ? "ready" : "implemented", report: "evidence" },
          };
        },
      }));
      assert.deepEqual(calls, ["scout", "worker", "reviewer"].slice(0, ["scout", "worker", "reviewer"].indexOf(stage) + 1));
    });
  }
}

for (const stage of ["scout", "worker"]) {
  test(`${stage} blocked verdict prevents the next stage`, async () => {
    await assert.rejects(workflow("fix bug", {
      [stage]: { ok: true, structuredOutput: { verdict: "blocked", report: "needs a decision" } },
    }), /blocked: needs a decision/);
  });
}

for (const verdict of ["issues", "blocked"]) {
  test(`reviewer ${verdict} is needs-attention, not approval`, async () => {
    const { result } = await workflow("fix bug", {
      reviewer: { ok: true, structuredOutput: { verdict, report: "file.ts:12: concrete finding" } },
    });
    assert.equal(result.status, "needs-attention");
    assert.equal(result.verdict, verdict);
    assert.match(result.implementation, /worker evidence/);
    assert.match(result.review, /file.ts:12/);
  });
}

test("empty/oversized prompts and absent approval cannot launch children", async () => {
  for (const prompt of ["", " \n", "x".repeat(8001)]) {
    const h = harness();
    await h.run(prompt);
    assert.equal(h.requests.length, 0);
    assert.match(h.notices[0].message, /Usage:/);
    h.shutdown();
  }
  const denied = harness({ approve: false });
  await denied.run();
  assert.equal(denied.requests.filter(request => request.method === "spawn").length, 0);
  denied.shutdown();
  const headless = harness({ hasUI: false });
  await assert.rejects(headless.run(), /requires a UI/);
  assert.equal(headless.requests.length, 0);
  headless.shutdown();
});

test("command launches one async workflow in cwd and records its identity before dispatch", async () => {
  let h: ReturnType<typeof harness>;
  h = harness({ respond(request) {
    if (request.method === "ping") return ping;
    assert.equal(h.entries.at(-1).data.id, `rpc-spawn-${request.requestId}`);
    assert.equal(request.params.cwd, h.ctx.cwd);
    assert.equal(request.params.async, true);
    assert.equal(request.params.worktree, false);
    assert.equal(request.params.context, "fresh");
    assert.equal(request.params.script, buildWorkflow("fix bug"));
    return started;
  } });
  await h.run();
  assert.equal(h.entries.at(-1).data.id, "run-1");
  assert.match(h.confirmations[0][1], /without per-edit approval/);
  assert.equal(h.messages[0].flags.triggerTurn, false);
  assert.equal(h.replyListeners().length, 0);
  h.shutdown();
});

test("running, unknown and unproven stopped workflows block duplicate writers across reload", async () => {
  for (const status of [terminal("running"), terminal("stopped", "unknown"), { success: false, error: { code: "not_found", message: "missing" } }]) {
    const h = harness({ respond: request => request.method === "ping" ? ping : request.method === "spawn" ? started : status });
    await h.run();
    h.hooks.session_start({}, h.ctx);
    await h.run("second task");
    assert.equal(h.requests.filter(request => request.method === "spawn").length, 1);
    assert.equal(h.confirmations.length, 1);
    assert.match(h.notices.at(-1).message, /termination is unverified/);
    h.shutdown();
  }
});

test("confirmed terminal proof permits another task", async () => {
  const h = harness({ respond: request => request.method === "ping" ? ping : request.method === "spawn" ? started : terminal() });
  await h.run();
  await h.run("second task");
  assert.equal(h.requests.filter(request => request.method === "spawn").length, 2);
  h.shutdown();
});

test("concurrent command invocations cannot race past approval", async () => {
  const h = harness();
  await Promise.all([h.run(), h.run("second task")]);
  assert.equal(h.requests.filter(request => request.method === "spawn").length, 1);
  assert.ok(h.notices.some(notice => notice.message.includes("already in progress")));
  h.shutdown();
});

test("missing subagent API times out without dispatching", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const h = harness({ respond: () => undefined });
  const run = h.run();
  await Promise.resolve();
  t.mock.timers.tick(2001);
  await run;
  assert.match(h.notices.at(-1).message, /ping acknowledgement timed out/);
  assert.equal(h.entries.length, 0);
  assert.equal(h.replyListeners().length, 0);
  h.shutdown();
});

test("lost spawn acknowledgement retains alias and never automatically redispatches", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const h = harness({ respond: request => request.method === "ping" ? ping : undefined });
  const run = h.run();
  for (let i = 0; i < 6; i++) await Promise.resolve();
  assert.equal(h.requests.at(-1).method, "spawn");
  t.mock.timers.tick(30001);
  await run;
  const alias = h.entries.at(-1).data.id;
  assert.match(alias, /^rpc-spawn-/);
  h.hooks.session_start({}, h.ctx);
  const retry = h.run("second task");
  for (let i = 0; i < 6; i++) await Promise.resolve();
  assert.equal(h.requests.at(-1).method, "status");
  assert.equal(h.requests.at(-1).params.id, alias);
  t.mock.timers.tick(5001);
  await retry;
  assert.equal(h.requests.filter(request => request.method === "spawn").length, 1);
  assert.equal(h.replyListeners().length, 0);
  h.shutdown();
});

test("prelaunch rejection clears reservation but execution failures retain it", async () => {
  for (const code of ["invalid_params", "execution_failed"]) {
    const h = harness({ respond: request => request.method === "ping" ? ping : { success: false, error: { code, message: "rejected" } } });
    await h.run();
    assert.equal(h.entries.at(-1).data.id === null, code === "invalid_params");
    assert.match(h.notices.at(-1).message, /rejected/);
    h.shutdown();
  }
});

test("shutdown cancels pending RPC listeners without claiming a dispatched run was stopped", async () => {
  const h = harness({ respond: request => request.method === "ping" ? ping : undefined });
  const run = h.run();
  for (let i = 0; i < 6; i++) await Promise.resolve();
  h.shutdown();
  await run;
  assert.equal(h.replyListeners().length, 0);
  assert.match(h.entries.at(-1).data.id, /^rpc-spawn-/);
});

test("session replacement after a reply cannot use stale context", async () => {
  for (const method of ["ping", "spawn"]) {
    let h: ReturnType<typeof harness>;
    h = harness({ respond(request) {
      if (request.method === method) queueMicrotask(() => h.hooks.session_start({}, h.ctx));
      return request.method === "ping" ? ping : started;
    } });
    await h.run();
    assert.equal(h.messages.length, 0);
    assert.equal(h.requests.filter(request => request.method === "spawn").length, method === "ping" ? 0 : 1);
    h.shutdown();
  }
});

test("session replacement during confirmation cannot dispatch with stale context", async () => {
  const h = harness();
  h.ctx.ui.confirm = async () => { h.hooks.session_start({}, h.ctx); return true; };
  await h.run();
  assert.equal(h.requests.filter(request => request.method === "spawn").length, 0);
  h.shutdown();
});
