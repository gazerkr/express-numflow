/**
 * WebSocket Types
 *
 * Type definitions for WebSocket Feature-First architecture
 */

import type { Socket, Server } from 'socket.io'
import type { Context, StepFunction, StepInfo, AsyncTaskInfo } from '../core/types'

/**
 * WebSocket event type
 */
export type WsEventType = 'connect' | 'disconnect' | 'message'

/**
 * WebSocket Trigger
 * Second parameter of Step function
 */
export interface WsTrigger {
  /** Trigger type */
  type: 'ws'

  /** Event type (connect, disconnect, message) */
  event: WsEventType

  /** Custom event name (e.g., 'chat:send') */
  eventName: string

  /** Data sent by client */
  data: any

  /** Socket.io socket object */
  socket: Socket

  /** Socket.io server object */
  io: Server
}

/**
 * WebSocket Responder
 * Third parameter of Step function
 */
export interface WsResponder {
  /**
   * Emit event to current socket
   */
  emit(event: string, data: any): void

  /**
   * Broadcast to all sockets except self
   */
  broadcast(event: string, data: any): void

  /**
   * Emit event to specific room (excluding self)
   */
  to(room: string): WsResponder

  /**
   * Emit event to all sockets (including self)
   */
  toAll(event: string, data: any): void

  /**
   * Join a room
   */
  join(room: string): void

  /**
   * Leave a room
   */
  leave(room: string): void

  /**
   * Disconnect
   */
  disconnect(close?: boolean): void
}

/**
 * WebSocket Step function
 */
export type WsStepFunction = StepFunction<WsTrigger, WsResponder>

/**
 * WebSocket Step information
 */
export type WsStepInfo = StepInfo<WsTrigger, WsResponder>

/**
 * WebSocket Context (maintained for connection lifetime)
 */
export interface WsContext extends Context {
  /** Socket ID */
  __socketId?: string

  /** Context creation time */
  __createdAt?: number

  /** Last activity time */
  __lastActivityAt?: number

  /** Flow stop flag */
  __stop?: boolean
}

/**
 * WebSocket Feature configuration
 */
export interface WsFeatureConfig {
  /** Event name (e.g., 'connect', 'disconnect', 'chat:send') */
  event: string

  /** Event type */
  eventType: WsEventType

  /** Steps folder path */
  steps?: string

  /** Async Tasks folder path */
  asyncTasks?: string

  /** Context initialization function */
  contextInitializer?: (ctx: WsContext, trigger: WsTrigger) => void | Promise<void>

  /** Error handler */
  onError?: (
    error: Error,
    ctx: WsContext,
    trigger: WsTrigger,
    responder: WsResponder
  ) => void | Promise<void>
}

/**
 * Scanned WebSocket Feature information
 */
export interface ScannedWsFeature {
  /** Event name */
  event: string

  /** Event type */
  eventType: WsEventType

  /** Steps list */
  steps: WsStepInfo[]

  /** Async Tasks list */
  asyncTasks: AsyncTaskInfo[]

  /** Feature configuration (if index.js exists) */
  config?: Partial<WsFeatureConfig>

  /** Feature directory path */
  dirPath: string
}

/**
 * createWsHandler options
 */
export interface CreateWsHandlerOptions {
  /**
   * Debug logging
   * @default false
   */
  debug?: boolean

  /**
   * Directories to exclude
   * @default ['node_modules', '.git', 'dist', 'build']
   */
  excludeDirs?: string[]

  /**
   * Context maximum retention time (ms)
   * @default 86400000 (24 hours)
   */
  contextMaxAge?: number

  /**
   * Context cleanup interval (ms)
   * @default 60000 (1 minute)
   */
  contextCleanupInterval?: number

  /**
   * Global error handler
   */
  onError?: (
    error: Error,
    ctx: WsContext,
    trigger: WsTrigger,
    responder: WsResponder
  ) => void | Promise<void>
}

/**
 * WebSocket Handler interface
 */
export interface WsHandler {
  /**
   * Handle socket connection (can be directly connected to Socket.io)
   */
  (socket: Socket): void

  /**
   * Handle socket connection (explicit call)
   */
  handleConnection(socket: Socket): void

  /**
   * Manually execute specific event (for testing)
   */
  handleEvent(socketId: string, event: string, data: any): Promise<void>

  /**
   * Get context (for debugging)
   */
  getContext(socketId: string): WsContext | undefined

  /**
   * Cleanup resources
   */
  destroy(): void
}
