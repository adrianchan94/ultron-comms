// kev-bridge — cloud-resident Kev presence on the ultron-comms mesh.
//
// Connects to an ultron-comms coordinator as Kev's stable peer (default
// peerId KX7onZR1, override via ULTRON_COMMS_PEER_ID). Inbound DMs are
// forwarded to Kev's Letta Cloud agent as a fresh user turn; the
// assistant reply is sent back over the mesh as a DM from Kev to the
// original sender. Survives the Mac mini being off because everything
// runs in-process inside the container.
//
// Env:
//   ULTRON_COMMS_HOST       coordinator hostname (default: localhost)
//   ULTRON_COMMS_PORT       coordinator port (default: 19876, use 443 for
//                           Northflank-fronted wss)
//   ULTRON_COMMS_TRANSPORT  "tcp" or "ws" (default: tcp, use "ws" for cloud)
//   ULTRON_COMMS_KEY        shared-secret bearer (required for auth)
//   ULTRON_COMMS_PEER_ID    stable peer id (default: KX7onZR1)
//   LETTA_API_KEY           required — bearer for api.letta.com
//   LETTA_URL               default: https://api.letta.com
//   LETTA_AGENT_ID          Kev's agent id (default: Kev's known id)
//   KEV_BRIDGE_MAX_ATTEMPTS retries on Letta 409 busy (default: 6)
//   KEV_BRIDGE_TIMEOUT_MS   per-request timeout (default: 180000)
//
// Conversation state is held in-process — every container restart starts
// a fresh Fast Lane conversation in Letta. The Mac mini's mesh-kev-direct
// persists across restarts, but the cloud bridge is the failover path so
// short-lived state is acceptable.

import {
  MeshStore,
  ensureRegistered,
  type DeliveryEvent,
} from "../../core/index.js";

interface BridgeConfig {
  peerId: string;
  lettaUrl: string;
  lettaKey: string;
  lettaAgentId: string;
  maxAttempts: number;
  timeoutMs: number;
}

interface LettaResponse {
  status: number;
  body: string;
}

interface ConversationState {
  id?: string;
  summary: string;
}

const DEFAULT_KEV_AGENT_ID = "agent-71b0883e-c63f-4e79-bab4-a45a1380bd60";
const DEFAULT_PEER_ID = "KX7onZR1";
const DEFAULT_CONVERSATION_SUMMARY = "MESH — ULTRON ↔ Kev Fast Lane";

function readConfig(): BridgeConfig {
  const lettaKey = process.env.LETTA_API_KEY ?? "";
  if (!lettaKey) {
    // eslint-disable-next-line no-console
    console.error("[kev-bridge] LETTA_API_KEY not set — refusing to start");
    process.exit(1);
  }
  // Coerce empty-string env vars to undefined so ?? defaults fire. Bash
  // passes unset vars as "", not absent, which would leave us with
  // lettaUrl="" and a "Failed to parse URL" crash on first request.
  const orDefault = (v: string | undefined, fallback: string): string =>
    v && v.trim().length > 0 ? v : fallback;
  return {
    peerId: orDefault(process.env.ULTRON_COMMS_PEER_ID, DEFAULT_PEER_ID),
    lettaUrl: orDefault(process.env.LETTA_URL, "https://api.letta.com").replace(/\/$/, ""),
    lettaKey,
    lettaAgentId: orDefault(process.env.LETTA_AGENT_ID, DEFAULT_KEV_AGENT_ID),
    maxAttempts: Math.max(1, Number(orDefault(process.env.KEV_BRIDGE_MAX_ATTEMPTS, "6"))),
    timeoutMs: Math.max(1000, Number(orDefault(process.env.KEV_BRIDGE_TIMEOUT_MS, "180000"))),
  };
}

async function lettaRequest(
  cfg: BridgeConfig,
  method: string,
  path: string,
  body: unknown | null,
  timeoutMs: number,
): Promise<LettaResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const init: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${cfg.lettaKey}`,
        "Content-Type": "application/json",
        Accept: "text/event-stream, application/json",
        "User-Agent": "ultron-comms-kev-bridge/1.0",
      },
      signal: controller.signal,
    };
    if (body != null) init.body = JSON.stringify(body);
    const resp = await fetch(`${cfg.lettaUrl}${path}`, init);
    const text = await resp.text();
    return { status: resp.status, body: text };
  } catch (err) {
    return { status: 0, body: String((err as Error)?.message ?? err) };
  } finally {
    clearTimeout(timer);
  }
}

async function ensureConversation(
  cfg: BridgeConfig,
  state: ConversationState,
): Promise<ConversationState> {
  if (state.id) {
    const r = await lettaRequest(cfg, "GET", `/v1/conversations/${state.id}`, null, 15000);
    if (r.status >= 200 && r.status < 300) {
      try {
        const data = JSON.parse(r.body) as { agent_id?: string };
        if (data.agent_id === cfg.lettaAgentId) return state;
      } catch { /* fall through */ }
    }
    delete state.id;
  }
  // Letta now requires agent_id as a query parameter (server returns 422
  // with detail loc=("query","agent_id") if absent from the URL). Keep
  // it in the body too for forward-compat.
  const create = await lettaRequest(
    cfg,
    "POST",
    `/v1/conversations/?agent_id=${encodeURIComponent(cfg.lettaAgentId)}`,
    { agent_id: cfg.lettaAgentId, summary: state.summary },
    20000,
  );
  if (create.status < 200 || create.status >= 300) {
    throw new Error(`letta create-conversation status=${create.status} body=${create.body.slice(0, 200)}`);
  }
  const data = JSON.parse(create.body) as { id: string; summary?: string };
  state.id = data.id;
  state.summary = data.summary ?? state.summary;
  return state;
}

function parseAssistantFromStream(body: string): string {
  const out: string[] = [];
  for (const line of body.split(/\r?\n/)) {
    if (!line.startsWith("data:")) continue;
    const raw = line.slice(5).trim();
    if (!raw || raw === "[DONE]") continue;
    try {
      const chunk = JSON.parse(raw) as { message_type?: string; content?: unknown };
      if (chunk.message_type !== "assistant_message") continue;
      const c = chunk.content;
      if (typeof c === "string") out.push(c);
      else if (Array.isArray(c)) {
        for (const part of c) {
          if (part && typeof part === "object" && "text" in part) {
            out.push(String((part as { text?: unknown }).text ?? ""));
          } else {
            out.push(String(part));
          }
        }
      }
    } catch { /* skip malformed chunk */ }
  }
  return out.join("\n").trim();
}

function isBusy(r: LettaResponse): boolean {
  return r.status === 409 || /currently being processed|CONFLICT/i.test(r.body);
}

async function askKev(
  cfg: BridgeConfig,
  state: ConversationState,
  prompt: string,
  log: (msg: string) => void,
): Promise<string | null> {
  await ensureConversation(cfg, state);
  for (let attempt = 1; attempt <= cfg.maxAttempts; attempt += 1) {
    if (!state.id) await ensureConversation(cfg, state);
    const t0 = Date.now();
    const r = await lettaRequest(
      cfg,
      "POST",
      `/v1/conversations/${state.id}/messages`,
      { messages: [{ role: "user", content: prompt }] },
      cfg.timeoutMs,
    );
    const elapsedMs = Date.now() - t0;
    if (r.status >= 200 && r.status < 300) {
      const text = parseAssistantFromStream(r.body);
      log(`letta ok attempt=${attempt} elapsed=${elapsedMs}ms reply_len=${text.length}`);
      return text || null;
    }
    if (isBusy(r) && attempt < cfg.maxAttempts) {
      const delay = Math.min(30000, 1500 * attempt);
      log(`letta busy attempt=${attempt} status=${r.status} retry-in=${delay}ms`);
      await new Promise((res) => setTimeout(res, delay));
      continue;
    }
    log(`letta fail attempt=${attempt} status=${r.status} body=${r.body.slice(0, 240)}`);
    return null;
  }
  return null;
}

export async function runKevBridge(): Promise<void> {
  const cfg = readConfig();
  const log = (msg: string): void => {
    // eslint-disable-next-line no-console
    console.log(`[kev-bridge] ${new Date().toISOString()} ${msg}`);
  };
  log(`starting peerId=${cfg.peerId} letta=${cfg.lettaUrl} agent=${cfg.lettaAgentId.slice(0, 20)}…`);

  const store = new MeshStore();
  // Force peerId BEFORE init so the coordinator registers us as Kev.
  (store as unknown as { peerId: string }).peerId = cfg.peerId;
  await store.init();
  log(`mesh init ok coord=${process.env.ULTRON_COMMS_PORT ?? "default"} isCoord=${(store as unknown as { isCoordinator?: boolean }).isCoordinator ?? false}`);

  const me = await ensureRegistered({
    store,
    defaultName: "kev",
    harness: "letta-cloud",
    cwd: process.cwd(),
  });
  log(`registered agentId=${me.agentId} isNew=${me.isNew}`);

  // Single in-memory Fast Lane conversation.
  const conversation: ConversationState = { summary: DEFAULT_CONVERSATION_SUMMARY };

  // Serialise Letta calls so we don't fan out concurrent requests against
  // the same agent (which would 409).
  let queue: Promise<void> = Promise.resolve();

  // Dedup inbound dm ids — the state-relay design fans the same patch
  // through multiple paths (local store push + coord relay + data-port
  // mirror) so we routinely see a message id 2–3 times. Without this we'd
  // call Letta N times per actual DM, which costs money and confuses Kev.
  const seenIds = new Set<string>();
  store.onDelivery = (agentId, event: DeliveryEvent): void => {
    if (agentId !== cfg.peerId) return; // only events addressed to Kev
    if (event.type !== "dm") return; // ignore receipts / room events
    const dm = event.message;
    if (dm.from === cfg.peerId) return; // ignore my own outbound echoes
    if (seenIds.has(dm.id)) return; // dedup duplicate fan-out
    seenIds.add(dm.id);
    if (seenIds.size > 5000) {
      const first = seenIds.values().next().value;
      if (first !== undefined) seenIds.delete(first);
    }
    const senderId = dm.from;
    const content = dm.content;
    log(`inbound dm from=${senderId} id=${dm.id} len=${content.length}`);
    queue = queue
      .catch(() => { /* keep queue alive on errors */ })
      .then(async () => {
        const reply = await askKev(cfg, conversation, content, log);
        if (!reply) {
          log(`no reply from letta — dropping`);
          return;
        }
        try {
          await store.sendDm(cfg.peerId, senderId, reply);
          log(`reply sent to=${senderId} len=${reply.length}`);
        } catch (err) {
          log(`reply send failed: ${(err as Error)?.message ?? err}`);
        }
      });
  };

  // Periodic re-register so peers can resolve us by name even if their
  // agent cache went stale (mirrors mac bridge behaviour).
  const reregisterTimer = setInterval(() => {
    void ensureRegistered({
      store,
      defaultName: "kev",
      harness: "letta-cloud",
      cwd: process.cwd(),
    }).catch(() => { /* best-effort */ });
  }, 60_000);
  reregisterTimer.unref?.();

  // Keep the process alive forever.
  const stop = async (sig: string): Promise<void> => {
    log(`signal ${sig} — shutting down`);
    try { await store.shutdown(); } catch { /* ignore */ }
    process.exit(0);
  };
  process.on("SIGTERM", () => void stop("SIGTERM"));
  process.on("SIGINT", () => void stop("SIGINT"));
  log(`bridge running — DMs to peerId=${cfg.peerId} forward to Letta`);
}
