/**
 * Feature-First Auto-Orchestration Types
 *
 * Type definitions for Feature-First architecture, the core differentiating feature of Numflow framework
 */

import { IncomingMessage, ServerResponse } from 'http'
import { RequestHandler } from '../types/index'
import type { RetrySignal, RETRY } from './retry'

// Re-export Core types for backward compatibility
export {
  Context,
  AsyncTaskFunction,
  AsyncTaskInfo,
  FeatureError,
} from '../core/types'

// Import for local use
import type { Context, AsyncTaskInfo } from '../core/types'

/**
 * HTTP Method type
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'

// Context is re-exported from '../core/types' above

/**
 * Step function type
 * Each step receives context, req, res for processing.
 *
 * @remarks
 * Step function stores data by directly modifying context.
 * Flow control follows JavaScript default behavior.
 *
 * ## Flow control
 *
 * 1. **Function runs to completion** → Automatically proceeds to next Step
 * 2. **throw Error** → Immediately to onError handler
 * 3. **return** (Function exit) → After Step ends:
 *    - `res.headersSent === true` → Skip next Step (Early response)
 *    - `res.headersSent === false` → Proceed to next Step
 *
 * **Return value is completely ignored.**
 *
 * ## Parameters
 *
 * - `context`: Pure business data storage
 * - `req`: HTTP Request object
 * - `res`: HTTP Response object
 *
 * @example
 * ```javascript
 * // ✅ Normal usage (99%)
 * module.exports = async (ctx, req, res) => {
 *   const user = await db.users.findById(req.params.id)
 *   ctx.user = user
 *   ctx.validated = true
 *   // Done! Next Step automatically
 * }
 * ```
 *
 * @example
 * ```javascript
 * // ✅ Error occurs (Immediate stop)
 * module.exports = async (ctx, req, res) => {
 *   if (!ctx.user) {
 *     throw new Error('User not found')  // To onError handler
 *   }
 *   ctx.validated = true
 *   // Done! Next Step
 * }
 * ```
 *
 * @example
 * ```javascript
 * // ✅ Early response (return required!)
 * module.exports = async (ctx, req, res) => {
 *   const cached = cache.get(req.url)
 *   if (cached) {
 *     return res.json(cached)  // Response + immediate exit
 *   }
 *   ctx.fresh = await fetchData()
 *   // Done! Next Step
 * }
 * ```
 *
 * @example
 * ```javascript
 * // ✅ JavaScript flexibility: Declare only needed parameters
 * module.exports = async (ctx) => {
 *   ctx.total = 100
 * }
 *
 * module.exports = async (ctx, req) => {
 *   ctx.userId = req.params.id
 * }
 * ```
 */
export type StepFunction = (
  context: Context,
  req: IncomingMessage,
  res: ServerResponse
) => Promise<void> | void

// AsyncTaskFunction is re-exported from '../core/types' above

/**
 * Step information (HTTP-specific)
 */
export interface StepInfo {
  /** Step number */
  number: number

  /** Filename */
  name: string

  /** Step function */
  fn: StepFunction

  /** File path */
  path: string
}

// AsyncTaskInfo is re-exported from '../core/types' above

/**
 * Feature Error Handler
 * Function that handles errors that occur during Feature execution
 *
 * @returns void | typeof RETRY | RetrySignal
 * - void: When error response is sent
 * - typeof RETRY: Immediate retry
 * - RetrySignal: Retry with options (delay, maxAttempts)
 */
export type FeatureErrorHandler = (
  error: Error,
  context: Context,
  req: IncomingMessage,
  res: ServerResponse
) => Promise<void | typeof RETRY | RetrySignal> | void | typeof RETRY | RetrySignal

/**
 * Feature configuration
 *
 * Convention over Configuration:
 * method, path, steps, asyncTasks are auto-inferred from folder structure.
 * Explicit specification overrides auto-inference.
 */
export interface FeatureConfig {
  /**
   * HTTP Method (optional)
   * Auto-inferred from folder name if not specified (get/post/put/delete/patch)
   */
  method?: HttpMethod

  /**
   * Route path (optional)
   * Auto-inferred from folder structure if not specified
   * Example: /features/api/v1/orders/post -> /api/v1/orders
   */
  path?: string

  /**
   * Steps (optional)
   * - String: folder path (Example: './steps')
   * - Auto-recognized as ./steps if not specified
   *
   * Convention over Configuration:
   * Create steps/ folder in Feature directory and create files in 100-xxx.js, 200-xxx.js format
   */
  steps?: string

  /**
   * Async tasks (optional)
   * - String: folder path (Example: './async-tasks')
   * - Auto-recognized as ./async-tasks if not specified
   *
   * Convention over Configuration:
   * Create async-tasks/ folder in Feature directory and create task files
   */
  asyncTasks?: string

  /** Feature-level middlewares (optional)
   * Executed before contextInitializer
   * Execution order: Global middlewares → Feature middlewares → contextInitializer → Steps
   */
  middlewares?: RequestHandler[]

  /** Context initializer function (optional)
   * Receives empty context object and initializes it.
   *
   * @example
   * ```javascript
   * contextInitializer: (ctx, req, res) => {
   *   ctx.userId = req.user?.id
   *   ctx.transaction = { id: generateId(), startedAt: Date.now() }
   * }
   * ```
   */
  contextInitializer?: (context: Context, req: IncomingMessage, res: ServerResponse) => Promise<void> | void

  /** Error handler (optional)
   * Called when error occurs during Step execution
   * Users can handle transaction rollback, logging, response sending, etc. directly
   */
  onError?: FeatureErrorHandler
}

/**
 * Feature Handler
 * Function that handles actual HTTP requests
 */
export type FeatureHandler = (req: IncomingMessage, res: ServerResponse) => Promise<void>

/**
 * Feature execution result
 */
export interface FeatureResult {
  /** Success status */
  success: boolean

  /** Final Context */
  context: Context

  /** Error (on failure) */
  error?: Error

  /** Execution time (ms) */
  executionTime: number
}

/**
 * Auto-Discovery options
 */
export interface AutoDiscoveryOptions {
  /** Directory path */
  directory: string

  /** File pattern */
  pattern: RegExp

  /** Allow duplicate numbers */
  allowDuplicates: boolean
}

/**
 * Auto-Execution options
 */
export interface AutoExecutionOptions {
  /** Step list */
  steps: StepInfo[]

  /** Context */
  context: Context

  /** HTTP Request */
  req: IncomingMessage

  /** HTTP Response */
  res: ServerResponse
}

/**
 * Async Task Scheduler options
 */
export interface AsyncTaskSchedulerOptions {
  /** Async task list */
  tasks: AsyncTaskInfo[]

  /** Context */
  context: Context
}

// FeatureError is re-exported from '../core/types' above

// ValidationError removed - use Express-style: error.statusCode = 400
