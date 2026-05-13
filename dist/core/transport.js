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
            onConnection(new WsWire(ws));
        });
        // Forward wss-level errors (e.g. handshake faults) to the http server so
        // one .on("error", ...) on the adapter catches both.
        this.wss.on("error", (err) => this.httpServer.emit("error", err));
    }
    listen(port, host, cb) {
        this.httpServer.listen(port, host, cb);
    }
    address() {
        return this.httpServer.address();
    }
    on(event, listener) {
        this.httpServer.on(event, listener);
        return this;
    }
    close(cb) {
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