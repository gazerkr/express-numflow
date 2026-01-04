/**
 * Connection Context Manager
 *
 * Manages Context per WebSocket connection
 * - Create Context on connection
 * - Query/update Context on event
 * - Delete Context on disconnection
 * - Periodic cleanup to prevent memory leaks
 */

import type { WsContext } from './types'

/**
 * Context Manager options
 */
export interface ContextManagerOptions {
  /**
   * Context maximum retention time (ms)
   * @default 86400000 (24 hours)
   */
  maxAge?: number

  /**
   * Cleanup interval (ms)
   * @default 60000 (1 minute)
   */
  cleanupInterval?: number

  /**
   * Debug logging
   * @default false
   */
  debug?: boolean
}

/**
 * Connection Context Manager class
 */
export class ConnectionContextManager {
  private contexts = new Map<string, WsContext>()
  private cleanupTimer: NodeJS.Timeout | null = null
  private readonly options: Required<ContextManagerOptions>

  constructor(options?: ContextManagerOptions) {
    this.options = {
      maxAge: options?.maxAge ?? 24 * 60 * 60 * 1000, // 24 hours
      cleanupInterval: options?.cleanupInterval ?? 60 * 1000, // 1 minute
      debug: options?.debug ?? false,
    }

    // Start periodic cleanup
    this.startCleanup()
  }

  /**
   * Create Context on connection
   *
   * @param socketId - Socket ID
   * @param initialData - Initial data
   * @returns Created Context
   */
  create(socketId: string, initialData?: Partial<WsContext>): WsContext {
    const now = Date.now()

    const ctx: WsContext = {
      __socketId: socketId,
      __createdAt: now,
      __lastActivityAt: now,
      ...initialData,
    }

    this.contexts.set(socketId, ctx)
    this.log(`Context created for ${socketId}`)

    return ctx
  }

  /**
   * Get Context
   *
   * @param socketId - Socket ID
   * @returns Context or undefined
   */
  get(socketId: string): WsContext | undefined {
    const ctx = this.contexts.get(socketId)

    if (ctx) {
      // Update last activity time
      ctx.__lastActivityAt = Date.now()
    }

    return ctx
  }

  /**
   * Get Context if exists, create if not
   *
   * @param socketId - Socket ID
   * @param initialData - Initial data (used only on creation)
   * @returns Context
   */
  getOrCreate(socketId: string, initialData?: Partial<WsContext>): WsContext {
    const existing = this.get(socketId)
    if (existing) {
      return existing
    }
    return this.create(socketId, initialData)
  }

  /**
   * Delete Context on disconnection
   *
   * @param socketId - Socket ID
   * @returns Whether deletion was successful
   */
  delete(socketId: string): boolean {
    const deleted = this.contexts.delete(socketId)
    if (deleted) {
      this.log(`Context deleted for ${socketId}`)
    }
    return deleted
  }

  /**
   * Check if Context exists
   *
   * @param socketId - Socket ID
   * @returns Whether it exists
   */
  has(socketId: string): boolean {
    return this.contexts.has(socketId)
  }

  /**
   * Total Context count
   */
  get size(): number {
    return this.contexts.size
  }

  /**
   * Cleanup expired Contexts
   *
   * @param maxAgeMs - Maximum retention time (default: options.maxAge)
   * @returns Number of cleaned up Contexts
   */
  cleanup(maxAgeMs?: number): number {
    const maxAge = maxAgeMs ?? this.options.maxAge
    const now = Date.now()
    let cleaned = 0

    for (const [socketId, ctx] of this.contexts) {
      const age = now - (ctx.__createdAt || 0)
      if (age > maxAge) {
        this.contexts.delete(socketId)
        cleaned++
      }
    }

    if (cleaned > 0) {
      this.log(`Cleaned up ${cleaned} expired contexts`)
    }

    return cleaned
  }

  /**
   * Start periodic cleanup
   */
  private startCleanup(): void {
    if (this.cleanupTimer) {
      return
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.options.cleanupInterval)

    // Prevent timer from blocking Node.js exit
    this.cleanupTimer.unref()
  }

  /**
   * Stop periodic cleanup
   */
  private stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopCleanup()
    this.contexts.clear()
    this.log('Context manager destroyed')
  }

  /**
   * Return all Contexts (for debugging)
   */
  getAll(): Map<string, WsContext> {
    return new Map(this.contexts)
  }

  /**
   * Debug log
   */
  private log(message: string): void {
    if (this.options.debug) {
      console.log(`[WsContextManager] ${message}`)
    }
  }
}
