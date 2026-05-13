/**
 * Web UI server — HTTP + WebSocket for browser-based chat.
 *
 * Serves a single-page frontend and exposes a JSON API over HTTP
 * with real-time delivery events over WebSocket.
 *
 * REST endpoints:
 *   GET  /           → frontend HTML
 *   GET  /api/agents → list agents
 *   GET  /api/rooms  → list rooms
 *   GET  /api/rooms/:id/messages → read room messages
 *   POST /api/action → execute any CommsAction
 *
 * WebSocket:
 *   Server pushes delivery events as JSON frames.
 *   Client sends action objects.
 */
import * as http from "node:http";
import { WebSocketServer } from "ws";
import { ChatController } from "../controller.js";
export interface WebServerHandle {
    server: http.Server;
    controller: ChatController;
    wss: WebSocketServer;
}
/**
 * Start the web UI server on an OS-assigned port.
 * Returns the server handle, or undefined if port discovery fails.
 */
export declare function tryStartWebServer(): Promise<WebServerHandle | undefined>;
/**
 * Create and start the web server on a dynamic port.
 * Used by tryStartWebServer (auto-start) and runWeb (standalone mode).
 */
export declare function createWebServer(port?: number): Promise<WebServerHandle>;
export declare function runWeb(userName: string, port?: number): Promise<void>;
//# sourceMappingURL=server.d.ts.map