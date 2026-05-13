/**
 * Agent Comms — shared protocol types and Zod schemas.
 *
 * Every type is derived from its Zod schema (single source of truth).
 * Use `Schema.parse(raw)` at JSON boundaries instead of `JSON.parse(raw) as T`.
 * Use `Schema.is(value)` for type narrowing.
 */
import { z } from "zod";
export type AgentId = string;
export type RoomId = string;
export declare const Visibility: z.ZodUnion<readonly [z.ZodLiteral<"visible">, z.ZodLiteral<"hidden">, z.ZodLiteral<"ghost">]> & {
    is(value: unknown): value is "visible" | "hidden" | "ghost";
};
export type Visibility = z.infer<typeof Visibility>;
export declare const AgentStatus: z.ZodUnion<readonly [z.ZodLiteral<"active">, z.ZodLiteral<"idle">, z.ZodLiteral<"busy">, z.ZodLiteral<"offline">]> & {
    is(value: unknown): value is "active" | "idle" | "busy" | "offline";
};
export type AgentStatus = z.infer<typeof AgentStatus>;
export declare const RoomType: z.ZodUnion<readonly [z.ZodLiteral<"public">, z.ZodLiteral<"private">, z.ZodLiteral<"secret">]> & {
    is(value: unknown): value is "public" | "private" | "secret";
};
export type RoomType = z.infer<typeof RoomType>;
export declare const AgentIdentitySchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    harness: z.ZodString;
    cwd: z.ZodString;
    pid: z.ZodNumber;
    startedAt: z.ZodString;
    visibility: z.ZodUnion<readonly [z.ZodLiteral<"visible">, z.ZodLiteral<"hidden">, z.ZodLiteral<"ghost">]> & {
        is(value: unknown): value is "visible" | "hidden" | "ghost";
    };
    status: z.ZodUnion<readonly [z.ZodLiteral<"active">, z.ZodLiteral<"idle">, z.ZodLiteral<"busy">, z.ZodLiteral<"offline">]> & {
        is(value: unknown): value is "active" | "idle" | "busy" | "offline";
    };
    tags: z.ZodArray<z.ZodString>;
    subscribedRooms: z.ZodArray<z.ZodString>;
}, z.core.$strip> & {
    is(value: unknown): value is {
        id: string;
        name: string;
        harness: string;
        cwd: string;
        pid: number;
        startedAt: string;
        visibility: "visible" | "hidden" | "ghost";
        status: "active" | "idle" | "busy" | "offline";
        tags: string[];
        subscribedRooms: string[];
    };
};
export type AgentIdentity = z.infer<typeof AgentIdentitySchema>;
export declare const RoomSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    type: z.ZodUnion<readonly [z.ZodLiteral<"public">, z.ZodLiteral<"private">, z.ZodLiteral<"secret">]> & {
        is(value: unknown): value is "public" | "private" | "secret";
    };
    owner: z.ZodString;
    createdAt: z.ZodString;
    description: z.ZodString;
    members: z.ZodArray<z.ZodString>;
    invited: z.ZodArray<z.ZodString>;
}, z.core.$strip> & {
    is(value: unknown): value is {
        id: string;
        name: string;
        type: "public" | "private" | "secret";
        owner: string;
        createdAt: string;
        description: string;
        members: string[];
        invited: string[];
    };
};
export type Room = z.infer<typeof RoomSchema>;
export declare const RoomMessageSchema: z.ZodObject<{
    id: z.ZodString;
    from: z.ZodString;
    room: z.ZodString;
    content: z.ZodString;
    timestamp: z.ZodString;
    replyTo: z.ZodOptional<z.ZodString>;
    readBy: z.ZodArray<z.ZodString>;
}, z.core.$strip> & {
    is(value: unknown): value is {
        id: string;
        from: string;
        room: string;
        content: string;
        timestamp: string;
        readBy: string[];
        replyTo?: string | undefined;
    };
};
export type RoomMessage = z.infer<typeof RoomMessageSchema>;
export declare const DmMessageSchema: z.ZodObject<{
    id: z.ZodString;
    from: z.ZodString;
    to: z.ZodString;
    content: z.ZodString;
    timestamp: z.ZodString;
    readBy: z.ZodArray<z.ZodString>;
}, z.core.$strip> & {
    is(value: unknown): value is {
        id: string;
        from: string;
        to: string;
        content: string;
        timestamp: string;
        readBy: string[];
    };
};
export type DmMessage = z.infer<typeof DmMessageSchema>;
export declare const DeliveryStatus: z.ZodUnion<readonly [z.ZodLiteral<"delivered">, z.ZodLiteral<"read">]> & {
    is(value: unknown): value is "delivered" | "read";
};
export type DeliveryStatus = z.infer<typeof DeliveryStatus>;
export declare const RoomMemberSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    status: z.ZodUnion<readonly [z.ZodLiteral<"active">, z.ZodLiteral<"idle">, z.ZodLiteral<"busy">, z.ZodLiteral<"offline">]> & {
        is(value: unknown): value is "active" | "idle" | "busy" | "offline";
    };
}, z.core.$strip> & {
    is(value: unknown): value is {
        id: string;
        name: string;
        status: "active" | "idle" | "busy" | "offline";
    };
};
export type RoomMember = z.infer<typeof RoomMemberSchema>;
export declare const DeliveryEventSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"room_message">;
    message: z.ZodObject<{
        id: z.ZodString;
        from: z.ZodString;
        room: z.ZodString;
        content: z.ZodString;
        timestamp: z.ZodString;
        replyTo: z.ZodOptional<z.ZodString>;
        readBy: z.ZodArray<z.ZodString>;
    }, z.core.$strip> & {
        is(value: unknown): value is {
            id: string;
            from: string;
            room: string;
            content: string;
            timestamp: string;
            readBy: string[];
            replyTo?: string | undefined;
        };
    };
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"dm">;
    message: z.ZodObject<{
        id: z.ZodString;
        from: z.ZodString;
        to: z.ZodString;
        content: z.ZodString;
        timestamp: z.ZodString;
        readBy: z.ZodArray<z.ZodString>;
    }, z.core.$strip> & {
        is(value: unknown): value is {
            id: string;
            from: string;
            to: string;
            content: string;
            timestamp: string;
            readBy: string[];
        };
    };
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"room_invite">;
    room: z.ZodString;
    roomDescription: z.ZodString;
    from: z.ZodString;
    fromName: z.ZodString;
    fromCwd: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"member_joined">;
    room: z.ZodString;
    agent: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"member_left">;
    room: z.ZodString;
    agent: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"room_members">;
    room: z.ZodString;
    members: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        status: z.ZodUnion<readonly [z.ZodLiteral<"active">, z.ZodLiteral<"idle">, z.ZodLiteral<"busy">, z.ZodLiteral<"offline">]> & {
            is(value: unknown): value is "active" | "idle" | "busy" | "offline";
        };
    }, z.core.$strip> & {
        is(value: unknown): value is {
            id: string;
            name: string;
            status: "active" | "idle" | "busy" | "offline";
        };
    }>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"member_status">;
    room: z.ZodString;
    agent: z.ZodString;
    status: z.ZodUnion<readonly [z.ZodLiteral<"active">, z.ZodLiteral<"idle">, z.ZodLiteral<"busy">, z.ZodLiteral<"offline">]> & {
        is(value: unknown): value is "active" | "idle" | "busy" | "offline";
    };
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"delivery_status">;
    messageId: z.ZodString;
    agent: z.ZodString;
    status: z.ZodUnion<readonly [z.ZodLiteral<"delivered">, z.ZodLiteral<"read">]> & {
        is(value: unknown): value is "delivered" | "read";
    };
    room: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"invite_declined">;
    room: z.ZodString;
    agent: z.ZodString;
    agentName: z.ZodString;
    reason: z.ZodString;
}, z.core.$strip>], "type"> & {
    is(value: unknown): value is {
        type: "room_message";
        message: {
            id: string;
            from: string;
            room: string;
            content: string;
            timestamp: string;
            readBy: string[];
            replyTo?: string | undefined;
        };
    } | {
        type: "dm";
        message: {
            id: string;
            from: string;
            to: string;
            content: string;
            timestamp: string;
            readBy: string[];
        };
    } | {
        type: "room_invite";
        room: string;
        roomDescription: string;
        from: string;
        fromName: string;
        fromCwd: string;
    } | {
        type: "member_joined";
        room: string;
        agent: string;
    } | {
        type: "member_left";
        room: string;
        agent: string;
    } | {
        type: "room_members";
        room: string;
        members: {
            id: string;
            name: string;
            status: "active" | "idle" | "busy" | "offline";
        }[];
    } | {
        type: "member_status";
        room: string;
        agent: string;
        status: "active" | "idle" | "busy" | "offline";
    } | {
        type: "delivery_status";
        messageId: string;
        agent: string;
        status: "delivered" | "read";
        room?: string | undefined;
    } | {
        type: "invite_declined";
        room: string;
        agent: string;
        agentName: string;
        reason: string;
    };
};
export type DeliveryEvent = z.infer<typeof DeliveryEventSchema>;
export declare const CommsActionSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    action: z.ZodLiteral<"register">;
    name: z.ZodString;
    visibility: z.ZodUnion<readonly [z.ZodLiteral<"visible">, z.ZodLiteral<"hidden">, z.ZodLiteral<"ghost">]> & {
        is(value: unknown): value is "visible" | "hidden" | "ghost";
    };
    tags: z.ZodArray<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"update">;
    visibility: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"visible">, z.ZodLiteral<"hidden">, z.ZodLiteral<"ghost">]> & {
        is(value: unknown): value is "visible" | "hidden" | "ghost";
    }>;
    status: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"active">, z.ZodLiteral<"idle">, z.ZodLiteral<"busy">, z.ZodLiteral<"offline">]> & {
        is(value: unknown): value is "active" | "idle" | "busy" | "offline";
    }>;
    name: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"whoami">;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"create_room">;
    name: z.ZodString;
    type: z.ZodUnion<readonly [z.ZodLiteral<"public">, z.ZodLiteral<"private">, z.ZodLiteral<"secret">]> & {
        is(value: unknown): value is "public" | "private" | "secret";
    };
    description: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"list_rooms">;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"join_room">;
    room: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"leave_room">;
    room: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"send">;
    target: z.ZodString;
    content: z.ZodString;
    replyTo: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"dm">;
    target: z.ZodString;
    content: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"list_agents">;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"read_room">;
    room: z.ZodString;
    since: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"invite">;
    room: z.ZodString;
    agent: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"kick">;
    room: z.ZodString;
    agent: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"decline_invite">;
    room: z.ZodString;
    reason: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"destroy_room">;
    room: z.ZodString;
}, z.core.$strip>], "action"> & {
    is(value: unknown): value is {
        action: "register";
        name: string;
        visibility: "visible" | "hidden" | "ghost";
        tags: string[];
    } | {
        action: "update";
        visibility?: "visible" | "hidden" | "ghost" | undefined;
        status?: "active" | "idle" | "busy" | "offline" | undefined;
        name?: string | undefined;
        tags?: string[] | undefined;
    } | {
        action: "whoami";
    } | {
        action: "create_room";
        name: string;
        type: "public" | "private" | "secret";
        description: string;
    } | {
        action: "list_rooms";
    } | {
        action: "join_room";
        room: string;
    } | {
        action: "leave_room";
        room: string;
    } | {
        action: "send";
        target: string;
        content: string;
        replyTo?: string | undefined;
    } | {
        action: "dm";
        target: string;
        content: string;
    } | {
        action: "list_agents";
    } | {
        action: "read_room";
        room: string;
        since?: string | undefined;
    } | {
        action: "invite";
        room: string;
        agent: string;
    } | {
        action: "kick";
        room: string;
        agent: string;
    } | {
        action: "decline_invite";
        room: string;
        reason: string;
    } | {
        action: "destroy_room";
        room: string;
    };
};
export type CommsAction = z.infer<typeof CommsActionSchema>;
//# sourceMappingURL=types.d.ts.map