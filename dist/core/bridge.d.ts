/**
 * Agent Comms — shared bridge helpers.
 *
 * Every bridge needs the same three things:
 *   1. Parse tool parameters into a CommsAction (via Zod schema)
 *   2. Format a DeliveryEvent as human-readable text
 *   3. Register (or recover) an agent identity
 *
 * Extracted here so each bridge only wires up its harness-specific
 * push mechanism and tool registration.
 */
import type { CommsStore } from "./comms-store.js";
import type { CommsAction, DeliveryEvent, Visibility } from "./types.js";
import { z } from "zod";
export declare const MCP_TOOL_PARAMS: z.ZodObject<{
    action: z.ZodEnum<{
        dm: "dm";
        register: "register";
        update: "update";
        whoami: "whoami";
        create_room: "create_room";
        list_rooms: "list_rooms";
        join_room: "join_room";
        leave_room: "leave_room";
        send: "send";
        list_agents: "list_agents";
        read_room: "read_room";
        invite: "invite";
        kick: "kick";
        decline_invite: "decline_invite";
        destroy_room: "destroy_room";
    }>;
    name: z.ZodOptional<z.ZodString>;
    visibility: z.ZodOptional<z.ZodEnum<{
        visible: "visible";
        hidden: "hidden";
        ghost: "ghost";
    }>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    status: z.ZodOptional<z.ZodEnum<{
        active: "active";
        idle: "idle";
        busy: "busy";
    }>>;
    room: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodEnum<{
        public: "public";
        private: "private";
        secret: "secret";
    }>>;
    description: z.ZodOptional<z.ZodString>;
    target: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodString>;
    agent: z.ZodOptional<z.ZodString>;
    since: z.ZodOptional<z.ZodString>;
    replyTo: z.ZodOptional<z.ZodString>;
    reason: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ToolParams = z.infer<typeof MCP_TOOL_PARAMS>;
export declare function buildAction(params: Record<string, unknown>): CommsAction;
export declare function formatDeliveryEvent(event: DeliveryEvent): string;
export interface RegistrationResult {
    agentId: string;
    store: CommsStore;
    isNew: boolean;
}
/**
 * Recover an existing identity (from `identity.json`) or register a new agent.
 * Returns the agent ID and whether this was a fresh registration.
 */
export declare function ensureRegistered(opts: {
    store: CommsStore;
    harness: string;
    cwd: string;
    defaultName: string;
    visibility?: Visibility;
    tags?: string[];
}): Promise<RegistrationResult>;
export declare function drainAndFormat(store: CommsStore, agentId: string): Promise<string[]>;
//# sourceMappingURL=bridge.d.ts.map