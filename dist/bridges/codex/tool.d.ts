/**
 * Agent Comms — Codex MCP tool server.
 *
 * Provides the "agent_comms" tool for Codex to call.
 * Uses TCP mesh for state sync. Pending messages are drained and
 * appended to every tool response so Codex sees them mid-turn.
 *
 * Run via: npx agent-comms bridge codex
 */
export declare function run(): Promise<void>;
//# sourceMappingURL=tool.d.ts.map