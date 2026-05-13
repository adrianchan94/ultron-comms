/**
 * ChatController — shared logic for user-facing UIs (TUI, web, CLI).
 *
 * Wraps MeshStore + CommsTool with an EventEmitter interface.
 * UIs subscribe to events and call methods — no direct MeshStore access needed.
 */
import { EventEmitter } from "node:events";
import { MeshStore, CommsTool, ensureRegistered, formatDeliveryEvent, } from "../../core/index.js";
// ---------------------------------------------------------------------------
// Event types
// ---------------------------------------------------------------------------
export class ChatController extends EventEmitter {
    userName;
    store;
    /** Expose the underlying MeshStore for handle cleanup. */
    get meshStore() {
        return this.store;
    }
    tool;
    ctx;
    currentRoom;
    constructor(userName) {
        super();
        this.userName = userName;
        this.store = new MeshStore();
        this.tool = new CommsTool(this.store);
        // Push delivery events to UIs
        this.store.onDelivery = (_agentId, event) => {
            this.emit("message", event);
        };
    }
    async init() {
        await this.store.init();
        const reg = await ensureRegistered({
            store: this.store,
            cwd: process.cwd(),
            harness: "user",
            defaultName: `${this.userName} (user)`,
            visibility: "visible",
            tags: ["user"],
        });
        this.ctx = {
            agentId: reg.agentId,
            harness: "user",
            cwd: process.cwd(),
            pid: process.pid,
        };
    }
    get agentId() {
        return this.ctx.agentId;
    }
    get activeRoom() {
        return this.currentRoom;
    }
    // -----------------------------------------------------------------------
    // Actions
    // -----------------------------------------------------------------------
    async listAgents() {
        return this.tool.handle(this.ctx, { action: "list_agents" });
    }
    async listRooms() {
        return this.tool.handle(this.ctx, { action: "list_rooms" });
    }
    async createRoom(name, type = "public", description = "") {
        const result = await this.tool.handle(this.ctx, {
            action: "create_room",
            name,
            type,
            description,
        });
        // Auto-switch to the created room
        this.currentRoom = name;
        return result;
    }
    async joinRoom(roomId) {
        const result = await this.tool.handle(this.ctx, {
            action: "join_room",
            room: roomId,
        });
        this.currentRoom = roomId;
        return result;
    }
    async leaveRoom(roomId) {
        const target = roomId ?? this.currentRoom;
        if (!target) {
            return { content: "No room to leave. Join a room first.", isError: true };
        }
        const result = await this.tool.handle(this.ctx, {
            action: "leave_room",
            room: target,
        });
        if (this.currentRoom === target) {
            this.currentRoom = undefined;
        }
        return result;
    }
    async send(target, content) {
        return this.tool.handle(this.ctx, { action: "send", target, content });
    }
    async sendToCurrentRoom(content) {
        if (!this.currentRoom) {
            return { content: "No active room. Join a room first.", isError: true };
        }
        return this.send(this.currentRoom, content);
    }
    async dm(targetAgentId, content) {
        return this.tool.handle(this.ctx, {
            action: "dm",
            target: targetAgentId,
            content,
        });
    }
    async readRoom(roomId, since) {
        const target = roomId ?? this.currentRoom;
        if (!target) {
            return { content: "No room to read. Join a room first.", isError: true };
        }
        return this.tool.handle(this.ctx, {
            action: "read_room",
            room: target,
            ...(since && { since }),
        });
    }
    async invite(roomId, agentId) {
        return this.tool.handle(this.ctx, {
            action: "invite",
            room: roomId,
            agent: agentId,
        });
    }
    async declineInvite(roomId, reason) {
        return this.tool.handle(this.ctx, {
            action: "decline_invite",
            room: roomId,
            reason,
        });
    }
    async kick(roomId, agentId) {
        return this.tool.handle(this.ctx, {
            action: "kick",
            room: roomId,
            agent: agentId,
        });
    }
    async destroyRoom(roomId) {
        const result = await this.tool.handle(this.ctx, {
            action: "destroy_room",
            room: roomId,
        });
        if (this.currentRoom === roomId) {
            this.currentRoom = undefined;
        }
        return result;
    }
    async switchRoom(roomId) {
        // Check if already a member — if not, join first
        const rooms = await this.store.listRooms(this.ctx.agentId);
        const room = rooms.find((r) => r.id === roomId || r.name === roomId);
        if (!room) {
            return { content: `Room "${roomId}" not found.`, isError: true };
        }
        if (!room.members.includes(this.ctx.agentId)) {
            const result = await this.joinRoom(room.id);
            if (result.isError)
                return result;
        }
        this.currentRoom = room.id;
        return {
            content: `Switched to ${room.name}.`,
            isError: false,
        };
    }
    // -----------------------------------------------------------------------
    // Raw access for web API
    // -----------------------------------------------------------------------
    async getAgents() {
        return this.store.listAgents(this.ctx.agentId);
    }
    async getRooms() {
        return this.store.listRooms(this.ctx.agentId);
    }
    async getRoomMessages(roomId, since) {
        return this.store.readRoomMessages(roomId, since);
    }
    formatEvent(event) {
        return formatDeliveryEvent(event);
    }
    // -----------------------------------------------------------------------
    // Lifecycle
    // -----------------------------------------------------------------------
    async shutdown() {
        await this.store.setAgentOffline(this.ctx.agentId);
        await this.store.shutdown();
    }
}
//# sourceMappingURL=controller.js.map