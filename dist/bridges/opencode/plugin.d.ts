/**
 * Agent Comms — OpenCode plugin bridge.
 *
 * Receives incoming messages via TCP mesh push and injects them
 * into the OpenCode TUI via tui.prompt.append + tui.submitPrompt.
 *
 * Install (project):  ln -s ~/Developer/agent-comms/src/bridges/opencode/plugin.ts .opencode/plugins/agent-comms.ts
 * Install (global):   ln -s ~/Developer/agent-comms/src/bridges/opencode/plugin.ts ~/.config/opencode/plugins/agent-comms.ts
 */
export declare const AgentCommsPlugin: (opts: {
    project: unknown;
    client: unknown;
    $: unknown;
    directory: string;
    worktree: string;
}) => Promise<{
    event: ({ event }: {
        event: {
            type: string;
        };
    }) => Promise<void>;
}>;
//# sourceMappingURL=plugin.d.ts.map