/**
 * ChatController — shared logic for user-facing UIs (TUI, web, CLI).
 *
 * Wraps MeshStore + CommsTool with an EventEmitter interface.
 * UIs subscribe to events and call methods — no direct MeshStore access needed.
 */
import { EventEmitter } from "node:events";
import { MeshStore } from "../../core/index.js";
import type { CommsResult } from "../../core/tool.js";
import type { AgentIdentity, DeliveryEvent, Room, RoomMessage } from "../../core/types.js";
export declare class ChatController extends EventEmitter {
    private userName;
    private store;
    /** Expose the underlying MeshStore for handle cleanup. */
    get meshStore(): MeshStore;
    private tool;
    private ctx;
    private currentRoom;
    constructor(userName: string);
    init(): Promise<void>;
    get agentId(): string;
    get activeRoom(): string | undefined;
    listAgents(): Promise<CommsResult>;
    listRooms(): Promise<CommsResult>;
    createRoom(name: string, type?: "public" | "private" | "secret", description?: string): Promise<CommsResult>;
    joinRoom(roomId: string): Promise<CommsResult>;
    leaveRoom(roomId?: string): Promise<CommsResult>;
    send(target: string, content: string): Promise<CommsResult>;
    sendToCurrentRoom(content: string): Promise<CommsResult>;
    dm(targetAgentId: string, content: string): Promise<CommsResult>;
    readRoom(roomId?: string, since?: string): Promise<CommsResult>;
    invite(roomId: string, agentId: string): Promise<CommsResult>;
    declineInvite(roomId: string, reason: string): Promise<CommsResult>;
    kick(roomId: string, agentId: string): Promise<CommsResult>;
    destroyRoom(roomId: string): Promise<CommsResult>;
    switchRoom(roomId: string): Promise<CommsResult>;
    getAgents(): Promise<AgentIdentity[]>;
    getRooms(): Promise<Room[]>;
    getRoomMessages(roomId: string, since?: string): Promise<RoomMessage[]>;
    formatEvent(event: DeliveryEvent): string;
    shutdown(): Promise<void>;
}
//# sourceMappingURL=controller.d.ts.map