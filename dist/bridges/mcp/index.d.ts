/**
 * Agent Comms — generic MCP tool server.
 *
 * Standard MCP server that works with any MCP-compatible harness.
 * Uses TCP mesh for state sync. Pending messages are drained and
 * appended to every tool response so the agent sees them.
 *
 * Run via: npx agent-comms bridge mcp
 */
export declare function run(): Promise<void>;
//# sourceMappingURL=index.d.ts.map