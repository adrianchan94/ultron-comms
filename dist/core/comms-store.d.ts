/**
 * CommsStore — abstract interface for the agent communication store.
 *
 * Two implementations:
 *   FileStore — filesystem-backed, no server process (fallback)
 *   MeshStore — TCP peer mesh, in-memory, real-time push (preferred)
 *
 * Bridges depend on this interface, not on a specific implementation.
 */
import type { AgentIdentity, DeliveryEvent, DmMessage, Room, RoomMessage, RoomType, Visibility } from "./types.js";
export interface CommsStore {
    readIdentity(harness: string, cwd: string): Promise<{
        id: string;
    } | undefined>;
    writeIdentity(harness: string, cwd: string, id: string): Promise<void>;
    registerAgent(opts: {
        name: string;
        harness: string;
        cwd: string;
        pid: number;
        visibility: Visibility;
        tags: string[];
    }): Promise<AgentIdentity>;
    getAgent(id: string): Promise<AgentIdentity | undefined>;
    updateAgent(id: string, patch: Partial<Pick<AgentIdentity, "name" | "visibility" | "status" | "tags" | "pid">>): Promise<AgentIdentity>;
    listAgents(requesterId: string): Promise<AgentIdentity[]>;
    setAgentOffline(id: string): Promise<void>;
    createRoom(opts: {
        name: string;
        type: RoomType;
        owner: string;
        description: string;
    }): Promise<Room>;
    getRoom(id: string): Promise<Room | undefined>;
    listRooms(requesterId: string): Promise<Room[]>;
    joinRoom(roomId: string, agentId: string): Promise<Room>;
    leaveRoom(roomId: string, agentId: string): Promise<void>;
    inviteToRoom(roomId: string, targetId: string, inviterId: string): Promise<void>;
    declineInvite(roomId: string, agentId: string, reason: string): Promise<void>;
    kickFromRoom(roomId: string, targetId: string, kickerId: string): Promise<void>;
    destroyRoom(roomId: string, agentId: string): Promise<void>;
    sendRoomMessage(roomId: string, from: string, content: string, replyTo?: string): Promise<RoomMessage>;
    readRoomMessages(roomId: string, since?: string): Promise<RoomMessage[]>;
    sendDm(from: string, to: string, content: string): Promise<DmMessage>;
    deliver(agentId: string, event: DeliveryEvent): Promise<void>;
    drainDelivery(agentId: string): Promise<DeliveryEvent[]>;
    init(): Promise<void>;
}
//# sourceMappingURL=comms-store.d.ts.map