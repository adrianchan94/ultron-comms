/**
 * Transport adapter — abstracts TCP vs. WebSocket so mesh-store can deploy
 * unchanged on raw-TCP hosts (Hetzner, Fly, local) and HTTP-only hosts
 * (Northflank, Render, Cloudflare TLS edge).
 *
 * Selected via `ULTRON_COMMS_TRANSPORT=ws` (defaults to `tcp` — upstream compat).
 *
 * Wire framing: in both modes each message is `JSON.stringify(msg) + "\n"`.
 * In TCP mode `MessageBuffer` splits on `\n`. In WS mode each frame is one
 * full message but the trailing `\n` is harmless — MessageBuffer still works,
 * so the rest of mesh-store stays agnostic.
 */
import * as net from "node:net";
import * as http from "node:http";
import { WebSocketServer, WebSocket } from "ws";
export const TRANSPORT = process.env.ULTRON_COMMS_TRANSPORT === "ws" ? "ws" : "tcp";
// ---------------------------------------------------------------------------
// WebSocket adapter
// ---------------------------------------------------------------------------
class WsWire {
    ws;
    constructor(ws) {
        this.ws = ws;
    }
    write(data) {
        if (this.ws.readyState !== WebSocket.OPEN)
            return false;
        try {
            this.ws.send(data);
            return true;
        }
        catch {
            return false;
        }
    }
    on(event, listener) {
        if (event === "data") {
            this.ws.on("message", (msg) => {
                // WebSocket can deliver Buffer, ArrayBuffer, or fragmented Buffer[].
                const str = Buffer.isBuffer(msg)
                    ? msg.toString("utf8")
                    : Array.isArray(msg)
                        ? Buffer.concat(msg).toString("utf8")
                        : Buffer.from(msg).toString("utf8");
                listener(str);
            });
        }
        else if (event === "close") {
            this.ws.on("close", () => listener());
        }
        else if (event === "error") {
            this.ws.on("error", (err) => listener(err));
        }
        return this;
    }
    destroy() {
        try {
            this.ws.terminate();
        }
        catch {
            /* ignore */
        }
    }
    unref() {
        this.ws._socket?.unref?.();
    }
}
class WsServerAdapter {
    httpServer;
    wss;
    pingTimer;
    /**
     * Per-socket liveness flag flipped by pong handlers. Sockets that miss two
     * consecutive pings (no pong in ~50 s) get terminated so the coordinator's
     * peer book doesn't accumulate ghost connections behind a flapping NF edge.
     */
    alive = new WeakMap();
    constructor(onConnection) {
        this.httpServer = http.createServer((req, res) => {
            // Embedded health endpoint — single Northflank port for both
            // mesh traffic (WS upgrade) and health probe (GET /health).
            if (req.url === "/health" || req.url === "/healthz") {
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ ok: true, transport: "ws" }));
                return;
            }
            res.writeHead(426, { "content-type": "text/plain" }).end("WebSocket upgrade required\n");
        });
        this.wss = new WebSocketServer({ server: this.httpServer });
        this.wss.on("connection", (ws) => {
            this.alive.set(ws, true);
            ws.on("pong", () => this.alive.set(ws, true));
            onConnection(new WsWire(ws));
        });
        // Heartbeat: ping every 25 s so the Northflank/Cloudflare-style edge
        // doesn't kill idle WS connections at 60 s. ws-level ping is enough to
        // count as traffic on the TCP layer, AND lets us detect dead peers
        // that stopped responding (terminate them so reconnect logic fires).
        this.pingTimer = setInterval(() => {
            for (const client of this.wss.clients) {
                const ws = client;
                if (this.alive.get(ws) === false) {
                    try {
                        ws.terminate();
                    }
                    catch { /* ignore */ }
                    continue;
                }
                this.alive.set(ws, false);
                try {
                    ws.ping();
                }
                catch { /* ignore */ }
            }
        }, 25_000);
        // Heartbeat is supervisory — don't keep the loop alive on its own.
        this.pingTimer.unref?.();
        // Note: we intentionally do NOT re-emit wss errors onto httpServer.
        // ws.Server's WebSocketServer attaches itself to the http server and
        // already proxies httpServer errors to its own listeners, so any extra
        // wiring here causes an infinite emit loop (max-call-stack). Adapter
        // consumers wire one .on("error", ...) onto the http server (below);
        // any wss-level error will surface through that path on its own.
    }
    listen(port, host, cb) {
        this.httpServer.listen(port, host, cb);
    }
    address() {
        return this.httpServer.address();
    }
    on(event, listener) {
        // Attach to BOTH so handshake-time errors (wss) and listen-time errors
        // (httpServer) reach the same callback without an emit loop.
        this.httpServer.on(event, listener);
        this.wss.on(event, listener);
        return this;
    }
    close(cb) {
        try {
            clearInterval(this.pingTimer);
        }
        catch {
            /* ignore */
        }
        try {
            this.wss.close();
        }
        catch {
            /* ignore */
        }
        try {
            this.httpServer.close(cb);
        }
        catch {
            /* ignore */
        }
    }
    unref() {
        this.httpServer.unref();
        return this;
    }
}
// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------
/**
 * Create a transport-appropriate server. `onConnection` fires for each
 * accepted peer (TCP) or upgraded WS.
 */
export function createWireServer(onConnection) {
    if (TRANSPORT === "ws") {
        return new WsServerAdapter(onConnection);
    }
    const server = net.createServer((socket) => onConnection(socket));
    return server;
}
/**
 * Create a transport-appropriate client connection. `onConnect` fires once
 * the connection is established (TCP `connect` event or WS `open` event).
 *
 * Errors are NOT auto-handled — callers must hook `.on("error", ...)`.
 */
export function createWireConnection(opts, onConnect) {
    if (TRANSPORT === "ws") {
        // TLS detection: port 443 or explicit env opt-in => wss://, else ws://.
        // Northflank, Cloudflare, etc. all front public services on 443 with
        // automatic TLS termination, so wss:// is the canonical cloud case.
        const useTls = opts.port === 443 ||
            process.env.ULTRON_COMMS_TLS === "1" ||
            process.env.ULTRON_COMMS_TLS === "true";
        const scheme = useTls ? "wss" : "ws";
        // When the public host is fronted at 443 we omit the port (wss://host)
        // so SNI / virtual hosting works correctly with the NF load balancer.
        const url = useTls && opts.port === 443
            ? `${scheme}://${opts.host}`
            : `${scheme}://${opts.host}:${opts.port}`;
        const ws = new WebSocket(url);
        const wire = new WsWire(ws);
        ws.on("open", () => onConnect());
        return wire;
    }
    const socket = net.createConnection(opts, onConnect);
    return socket;
}
//# sourceMappingURL=transport.js.map