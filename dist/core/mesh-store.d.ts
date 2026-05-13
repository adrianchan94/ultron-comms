/**
 * MeshStore — TCP localhost peer mesh for agent communication.
 *
 * Each bridge instance is a peer in the mesh. Peers discover each other
 * via a coordinator (the first instance to bind the well-known port).
 * All state is held in memory and synchronised between peers.
 * Delivery events are pushed directly over TCP — no polling, no filesystem.
 *
 * Falls back to FileStore if the mesh is unavailable.
 */
import type { CommsStore } from "./comms-store.js";
import type { AgentIdentity, DeliveryEvent, DmMessage, Room, RoomMessage, RoomType, Visibility } from "./types.js";
export declare class MeshStore implements CommsStore {
    readonly peerId: string;
    readonly startedAt: string;
    readonly coordinatorPort: number;
    private agents;
    private rooms;
    private messages;
    private dms;
    private deliveryQueues;
    private identityCache;
    private dataServer;
    private dataPort;
    private coordinatorServer;
    private isCoordinator;
    private peerConnections;
    /** All sockets accepted by the data server — destroyed on shutdown. */
    private dataServerSockets;
    /** All sockets accepted by the coordinator server — destroyed on shutdown. */
    private coordinatorServerSockets;
    /** Socket connected to the coordinator (client side) — destroyed on shutdown. */
    private coordinatorSocket;
    private peerInfo;
    private staleCheckTimer;
    onDelivery: ((agentId: string, event: DeliveryEvent) => void | Promise<void>) | undefined;
    constructor(coordinatorPort?: number);
    init(): Promise<void>;
    private startDataServer;
    private tryJoinMesh;
    private connectToCoordinator;
    private handleCoordinatorResponse;
    private becomeCoordinator;
    private handleCoordinatorConnection;
    private handleIntroduction;
    private handleDataConnection;
    private handleDataMessage;
    private applyPatch;
    private connectToPeerData;
    private broadcastToDataConnections;
    private broadcastPatch;
    private deliverLocallyAndBroadcast;
    private deliverToRoom;
    private notifyRoomsOfStatus;
    private emitDeliveryStatus;
    private findMessageSender;
    private markRead;
    private applyReadReceipt;
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
    private startStaleCheck;
    private stopStaleCheck;
    private probeStaleAgents;
    private isProcessAlive;
    private handoverCoordinator;
    shutdown(): Promise<void>;
}
//# sourceMappingURL=mesh-store.d.ts.map