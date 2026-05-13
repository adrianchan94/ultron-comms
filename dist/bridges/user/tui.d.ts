/**
 * TUI — terminal chat interface using readline + ANSI escape codes.
 *
 * Commands:
 *   /join <room>      Join or switch to a room
 *   /leave [room]     Leave the current (or specified) room
 *   /rooms            List all rooms
 *   /agents           List all agents
 *   /read [room]      Read messages in current (or specified) room
 *   /dm <agent> <msg> Send a direct message
 *   /create <name>    Create a public room
 *   /invite <room> <agent>  Invite an agent to a room
 *   /decline <room> <reason> Decline a room invite
 *   /kick <room> <agent>    Kick an agent from a room
 *   /destroy <room>   Destroy a room
 *   /help             Show commands
 *   /quit             Exit
 *
 * Anything without / is sent to the current room.
 */
export declare function runTui(userName: string): Promise<void>;
//# sourceMappingURL=tui.d.ts.map