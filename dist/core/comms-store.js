/**
 * CommsStore — abstract interface for the agent communication store.
 *
 * Two implementations:
 *   FileStore — filesystem-backed, no server process (fallback)
 *   MeshStore — TCP peer mesh, in-memory, real-time push (preferred)
 *
 * Bridges depend on this interface, not on a specific implementation.
 */
export {};
//# sourceMappingURL=comms-store.js.map