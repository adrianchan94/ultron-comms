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
import type { AddressInfo } from "node:net";

export type Transport = "tcp" | "ws";

export const TRANSPORT: Transport =
  process.env.ULTRON_COMMS_TRANSPORT === "ws" ? "ws" : "tcp";

/**
 * Minimal duplex socket interface used by mesh-store. `net.Socket` satisfies
 * this structurally; `WsWire` wraps a WebSocket to match.
 */
export interface Wire {
  write(data: string): boolean;
  on(event: "data", listener: (data: Buffer | string) => void): this;
  on(event: "close", listener: () => void): this;
  on(event: "error", listener: (err: Error) => void): this;
  destroy(): void;
  unref?(): void;
}

/**
 * Minimal server interface. `net.Server` and our `WsServerAdapter` both
 * satisfy it.
 */
export interface WireServer {
  listen(port: number, host: string, cb: () => void): void;
  address(): AddressInfo | string | null;
  on(event: "error", listener: (err: Error) => void): this;
  close(cb?: () => void): void;
  unref?(): WireServer;
}

// ---------------------------------------------------------------------------
// WebSocket adapter
// ---------------------------------------------------------------------------

class WsWire implements Wire {
  constructor(private readonly ws: WebSocket) {}

  write(data: string): boolean {
    if (this.ws.readyState !== WebSocket.OPEN) return false;
    try {
      this.ws.send(data);
      return true;
    } catch {
      return false;
    }
  }

  on(event: "data" | "close" | "error", listener: (...args: any[]) => void): this {
    if (event === "data") {
      this.ws.on("message", (msg: Buffer | ArrayBuffer | Buffer[]) => {
        // WebSocket can deliver Buffer, ArrayBuffer, or fragmented Buffer[].
        const str = Buffer.isBuffer(msg)
          ? msg.toString("utf8")
          : Array.isArray(msg)
            ? Buffer.concat(msg).toString("utf8")
            : Buffer.from(msg).toString("utf8");
        listener(str);
      });
    } else if (event === "close") {
      this.ws.on("close", () => listener());
    } else if (event === "error") {
      this.ws.on("error", (err: Error) => listener(err));
    }
    return this;
  }

  destroy(): void {
    try {
      this.ws.terminate();
    } catch {
      /* ignore */
    }
  }

  unref(): void {
    // ws doesn't have a unref — but the underlying socket does.
    type WithSock = WebSocket & { _socket?: { unref?: () => void } };
    (this.ws as WithSock)._socket?.unref?.();
  }
}

class WsServerAdapter implements WireServer {
  private readonly httpServer: http.Server;
  private readonly wss: WebSocketServer;

  constructor(onConnection: (wire: Wire) => void) {
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
    // Note: we intentionally do NOT re-emit wss errors onto httpServer.
    // ws.Server's WebSocketServer attaches itself to the http server and
    // already proxies httpServer errors to its own listeners, so any extra
    // wiring here causes an infinite emit loop (max-call-stack). Adapter
    // consumers wire one .on("error", ...) onto the http server (below);
    // any wss-level error will surface through that path on its own.
  }

  listen(port: number, host: string, cb: () => void): void {
    this.httpServer.listen(port, host, cb);
  }

  address(): AddressInfo | string | null {
    return this.httpServer.address();
  }

  on(event: "error", listener: (err: Error) => void): this {
    // Attach to BOTH so handshake-time errors (wss) and listen-time errors
    // (httpServer) reach the same callback without an emit loop.
    this.httpServer.on(event, listener);
    this.wss.on(event, listener);
    return this;
  }

  close(cb?: () => void): void {
    try {
      this.wss.close();
    } catch {
      /* ignore */
    }
    try {
      this.httpServer.close(cb);
    } catch {
      /* ignore */
    }
  }

  unref(): WireServer {
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
export function createWireServer(onConnection: (wire: Wire) => void): WireServer {
  if (TRANSPORT === "ws") {
    return new WsServerAdapter(onConnection);
  }
  const server = net.createServer((socket) => onConnection(socket as unknown as Wire));
  return server as unknown as WireServer;
}

/**
 * Create a transport-appropriate client connection. `onConnect` fires once
 * the connection is established (TCP `connect` event or WS `open` event).
 *
 * Errors are NOT auto-handled — callers must hook `.on("error", ...)`.
 */
export function createWireConnection(
  opts: { port: number; host: string },
  onConnect: () => void,
): Wire {
  if (TRANSPORT === "ws") {
    // TLS detection: port 443 or explicit env opt-in => wss://, else ws://.
    // Northflank, Cloudflare, etc. all front public services on 443 with
    // automatic TLS termination, so wss:// is the canonical cloud case.
    const useTls =
      opts.port === 443 ||
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
  return socket as unknown as Wire;
}
