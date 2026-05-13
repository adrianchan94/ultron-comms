/**
 * Non-interactive CLI — one-shot commands that register, execute, print, and exit.
 *
 * Usage:
 *   agent-comms send <room> <message>
 *   agent-comms dm <agent> <message>
 *   agent-comms rooms
 *   agent-comms agents
 *   agent-comms read <room> [--since <iso>]
 */
export declare function runCli(command: string, args: string[], userName: string): Promise<void>;
//# sourceMappingURL=cli.d.ts.map