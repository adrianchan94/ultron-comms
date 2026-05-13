/**
 * agent-comms — cross-harness LLM agent communication mesh.
 *
 * Usage:
 *   npx agent-comms              # setup (auto-detect and configure)
 *   npx agent-comms setup        # same as above
 *   npx agent-comms status       # check current configuration
 *   npx agent-comms remove       # undo configuration
 *   npx agent-comms bridge <id>  # run a bridge (used by harness configs)
 *   npx agent-comms chat         # interactive TUI (web UI auto-starts)
 *   npx agent-comms send <room> <message>   # one-shot send
 *   npx agent-comms dm <agent> <message>     # one-shot DM
 *   npx agent-comms rooms                     # list rooms
 *   npx agent-comms agents                    # list agents
 *   npx agent-comms read <room>               # read room messages
 *
 * The bridge subcommand lets harnesses invoke the bridge via npx:
 *   .mcp.json:  { "command": "npx", "args": ["agent-comms", "bridge", "claude-code"] }
 *   config.toml: command = "npx", args = ["agent-comms", "bridge", "codex"]
 */
export {};
//# sourceMappingURL=cli.d.ts.map