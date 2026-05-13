/**
 * Tool handler — processes CommsAction objects and returns human-readable results.
 *
 * This is the shared logic that every bridge calls into. Bridges just:
 *   1. Parse the LLM's tool call into a CommsAction
 *   2. Call handleAction(action)
 *   3. Return the result string to the LLM
 */
import { CommsError } from "./store.js";
export class CommsTool {
    store;
    constructor(store) {
        this.store = store;
    }
    async handle(ctx, action) {
        try {
            switch (action.action) {
                case "register":
                    return await this.register(ctx, action);
                case "update":
                    return await this.update(ctx, action);
                case "whoami":
                    return await this.whoami(ctx);
                case "create_room":
                    return await this.createRoom(ctx, action);
                case "list_rooms":
                    return await this.listRooms(ctx);
                case "join_room":
                    return await this.joinRoom(ctx, action);
                case "leave_room":
                    return await this.leaveRoom(ctx, action);
                case "send":
                    return await this.send(ctx, action);
                case "dm":
                    return await this.dm(ctx, action);
                case "list_agents":
                    return await this.listAgents(ctx);
                case "read_room":
                    return await this.readRoom(ctx, action);
                case "invite":
                    return await this.invite(ctx, action);
                case "decline_invite":
                    return await this.declineInvite(ctx, action);
                case "kick":
                    return await this.kick(ctx, action);
                case "destroy_room":
                    return await this.destroyRoom(ctx, action);
                default:
                    return {
                        content: `Unknown action: ${JSON.stringify(action).slice(0, 100)}`,
                        isError: true,
                    };
            }
        }
        catch (err) {
            if (err instanceof CommsError) {
                return {
                    content: `Error: ${err.message} (${err.code})`,
                    isError: true,
                };
            }
            return {
                content: `Internal error: ${err instanceof Error ? err.message : String(err)}`,
                isError: true,
            };
        }
    }
    async register(ctx, action) {
        const agent = await this.store.registerAgent({
            name: action.name,
            harness: ctx.harness,
            cwd: ctx.cwd,
            pid: ctx.pid,
            visibility: action.visibility,
            tags: action.tags,
        });
        return {
            content: `Registered as ${agent.name} (${agent.id}) with visibility "${agent.visibility}".`,
            isError: false,
        };
    }
    async update(ctx, action) {
        const patch = {};
        if (action.visibility !== undefined)
            patch.visibility = action.visibility;
        if (action.status !== undefined)
            patch.status = action.status;
        if (action.name !== undefined)
            patch.name = action.name;
        if (action.tags !== undefined)
            patch.tags = action.tags;
        const agent = await this.store.updateAgent(ctx.agentId, patch);
        return {
            content: `Updated: name=${agent.name}, visibility=${agent.visibility}, status=${agent.status}`,
            isError: false,
        };
    }
    async whoami(ctx) {
        const agent = await this.store.getAgent(ctx.agentId);
        if (!agent)
            return { content: "Not registered.", isError: true };
        return {
            content: [
                `ID: ${agent.id}`,
                `Name: ${agent.name}`,
                `Harness: ${agent.harness}`,
                `Visibility: ${agent.visibility}`,
                `Status: ${agent.status}`,
                `Tags: ${agent.tags.join(", ") || "(none)"}`,
                `Rooms: ${agent.subscribedRooms.join(", ") || "(none)"}`,
            ].join("\n"),
            isError: false,
        };
    }
    async createRoom(ctx, action) {
        const room = await this.store.createRoom({
            name: action.name,
            type: action.type,
            owner: ctx.agentId,
            description: action.description,
        });
        // Auto-join the creator
        await this.store.joinRoom(room.id, ctx.agentId);
        return {
            content: `Created ${room.type} room "${room.name}" (${room.id}).`,
            isError: false,
        };
    }
    async listRooms(ctx) {
        const rooms = await this.store.listRooms(ctx.agentId);
        if (rooms.length === 0)
            return { content: "No rooms found.", isError: false };
        const lines = rooms.map((r) => {
            const memberFlag = r.members.includes(ctx.agentId) ? "✓" : " ";
            return `[${memberFlag}] ${r.type.padEnd(7)} ${r.name} (${String(r.members.length)} members) — ${r.description}`;
        });
        return {
            content: `Rooms ([✓] = joined):\n${lines.join("\n")}`,
            isError: false,
        };
    }
    async joinRoom(ctx, action) {
        const roomId = action.room;
        const room = await this.store.joinRoom(roomId, ctx.agentId);
        return {
            content: `Joined room "${room.name}" (${String(room.members.length)} members).`,
            isError: false,
        };
    }
    async leaveRoom(ctx, action) {
        await this.store.leaveRoom(action.room, ctx.agentId);
        return { content: `Left room "${action.room}".`, isError: false };
    }
    async send(ctx, action) {
        const roomId = action.target;
        const msg = await this.store.sendRoomMessage(roomId, ctx.agentId, action.content, action.replyTo);
        return {
            content: `Sent to ${action.target}: ${msg.id}`,
            isError: false,
        };
    }
    async dm(ctx, action) {
        const targetId = action.target;
        const msg = await this.store.sendDm(ctx.agentId, targetId, action.content);
        return {
            content: `DM sent to ${action.target}: ${msg.id}`,
            isError: false,
        };
    }
    async listAgents(ctx) {
        const agents = await this.store.listAgents(ctx.agentId);
        if (agents.length === 0)
            return { content: "No other agents online.", isError: false };
        const homedir = process.env.HOME ?? "";
        const abbreviateCwd = (cwd) => homedir && cwd.startsWith(homedir)
            ? `~${cwd.slice(homedir.length)}`
            : cwd;
        const lines = agents.map((a) => {
            const self = a.id === ctx.agentId ? " (you)" : "";
            const cwd = abbreviateCwd(a.cwd);
            const rooms = a.subscribedRooms.length > 0 ? a.subscribedRooms.join(", ") : "none";
            return `${a.id}  ${a.name.padEnd(25)} ${a.harness.padEnd(12)} ${a.status.padEnd(7)} ${a.visibility.padEnd(9)} ${cwd}${self}\n        Rooms: ${rooms}`;
        });
        return {
            content: `Agents:\n  ID      Name                      Harness      Status  Visibility  CWD\n${lines.map((l) => `  ${l}`).join("\n")}`,
            isError: false,
        };
    }
    async readRoom(ctx, action) {
        const roomId = action.room;
        const messages = await this.store.readRoomMessages(roomId, action.since);
        if (messages.length === 0)
            return { content: "No messages.", isError: false };
        const lines = messages.map((m) => {
            const time = m.timestamp.slice(11, 19);
            return `[${time}] ${m.from}: ${m.content}`;
        });
        return { content: lines.join("\n"), isError: false };
    }
    async invite(ctx, action) {
        await this.store.inviteToRoom(action.room, action.agent, ctx.agentId);
        return {
            content: `Invited ${action.agent} to ${action.room}.`,
            isError: false,
        };
    }
    async declineInvite(ctx, action) {
        await this.store.declineInvite(action.room, ctx.agentId, action.reason);
        return {
            content: `Declined invite to ${action.room}.`,
            isError: false,
        };
    }
    async kick(ctx, action) {
        await this.store.kickFromRoom(action.room, action.agent, ctx.agentId);
        return {
            content: `Kicked ${action.agent} from ${action.room}.`,
            isError: false,
        };
    }
    async destroyRoom(ctx, action) {
        await this.store.destroyRoom(action.room, ctx.agentId);
        return { content: `Destroyed room "${action.room}".`, isError: false };
    }
}
//# sourceMappingURL=tool.js.map