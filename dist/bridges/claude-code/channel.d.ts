/**
 * Agent Comms — Claude Code channel bridge.
 *
 * MCP channel server that provides the "agent_comms" tool and pushes
 * incoming messages into Claude's context via <channel> events.
 * Uses TCP mesh for real-time delivery — no filesystem polling.
 *
 * Run via: npx agent-comms bridge claude-code
 * Requires: claude --dangerously-load-development-channels
 */
export declare function run(): Promise<void>;
//# sourceMappingURL=channel.d.ts.map