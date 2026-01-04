/**
 * Core Types - Trigger-Agnostic
 *
 * Common type definitions used across all trigger types (HTTP, WebSocket, Event, etc.)
 */

/**
 * Generic Context
 * Storage for sharing data between Steps
 */
export interface Context {
  /**
   * Custom fields (added by developer)
   */
  [key: string]: any
}

/**
 * Generic Step function
 *
 * @template TTrigger - Trigger type (HTTP Request, WebSocket Event, etc.)
 * @template TResponder - Responder type (HTTP Response, WebSocket Emitter, etc.)
 */
export type StepFunction<TTrigger = any, TResponder = any> = (
  ctx: Context,
  trigger: TTrigger,
  responder: TResponder
) => Promise<void> | void

/**
 * Step information
 */
export interface StepInfo<TTrigger = any, TResponder = any> {
  /** Step number */
  number: number

  /** Filename */
  name: string

  /** Step function */
  fn: StepFunction<TTrigger, TResponder>

  /** File path */
  path: string
}

/**
 * Async Task function
 */
export type AsyncTaskFunction = (ctx: Context) => Promise<void> | void

/**
 * Async Task information
 */
export interface AsyncTaskInfo {
  /** Task name */
  name: string

  /** Task function */
  fn: AsyncTaskFunction

  /** File path */
  path: string
}

/**
 * Generic Executor options
 */
export interface ExecutorOptions<TTrigger = any, TResponder = any> {
  /** Step list */
  steps: StepInfo<TTrigger, TResponder>[]

  /** Context */
  context: Context

  /** Trigger */
  trigger: TTrigger

  /** Responder */
  responder: TResponder

  /** Execution completion check function (e.g., whether response has been sent) */
  isCompleted?: () => boolean

  /** Debug logging */
  debug?: boolean

  /** Log header (e.g., "[WS chat:send]") */
  logHeader?: string
}

/**
 * Step execution statistics
 */
export interface StepExecutionStats {
  stepNumber: number
  stepName: string
  success: boolean
  duration: number
  error?: Error
}

/**
 * Feature Error
 * Error that occurs during Step execution
 */
export class FeatureError extends Error {
  public readonly originalError?: Error
  public readonly step?: StepInfo
  public readonly context?: Context
  public readonly statusCode: number

  constructor(
    message: string,
    originalError?: Error,
    step?: StepInfo,
    context?: Context,
    statusCode: number = 500
  ) {
    super(message)
    this.name = 'FeatureError'
    this.originalError = originalError
    this.step = step
    this.context = context
    this.statusCode = statusCode
  }
}
