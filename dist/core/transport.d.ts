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
import type { AddressInfo } from "node:net";
export type Transport = "tcp" | "ws";
export declare const TRANSPORT: Transport;
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
/**
 * Create a transport-appropriate server. `onConnection` fires for each
 * accepted peer (TCP) or upgraded WS.
 */
export declare function createWireServer(onConnection: (wire: Wire) => void): WireServer;
/**
 * Create a transport-appropriate client connection. `onConnect` fires once
 * the connection is established (TCP `connect` event or WS `open` event).
 *
 * Errors are NOT auto-handled — callers must hook `.on("error", ...)`.
 */
export declare function createWireConnection(opts: {
    port: number;
    host: string;
}, onConnect: () => void): Wire;
//# sourceMappingURL=transport.d.ts.map