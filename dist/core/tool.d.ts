/**
 * Tool handler — processes CommsAction objects and returns human-readable results.
 *
 * This is the shared logic that every bridge calls into. Bridges just:
 *   1. Parse the LLM's tool call into a CommsAction
 *   2. Call handleAction(action)
 *   3. Return the result string to the LLM
 */
import type { AgentId, AgentIdentity, CommsAction } from "./types.js";
import type { CommsStore } from "./comms-store.js";
export interface CommsContext {
    agentId: AgentId;
    harness: AgentIdentity["harness"];
    cwd: string;
    pid: number;
}
export interface CommsResult {
    content: string;
    /** If true, the result is an error. */
    isError: boolean;
}
export declare class CommsTool {
    private readonly store;
    constructor(store: CommsStore);
    handle(ctx: CommsContext, action: CommsAction): Promise<CommsResult>;
    private register;
    private update;
    private whoami;
    private createRoom;
    private listRooms;
    private joinRoom;
    private leaveRoom;
    private send;
    private dm;
    private listAgents;
    private readRoom;
    private invite;
    private declineInvite;
    private kick;
    private destroyRoom;
}
//# sourceMappingURL=tool.d.ts.map