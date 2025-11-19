/**
 * Feature-First Auto-Orchestration Types
 *
 * Type definitions for Feature-First architecture, the core differentiating feature of Numflow framework
 */

import { IncomingMessage, ServerResponse } from 'http'
import { RequestHandler } from '../types/index'
import type { RetrySignal, RETRY } from './retry'

/**
 * HTTP Method type
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'

/**
 * Context object
 * Pure business data storage shared by all steps and async tasks
 *
 * @remarks
 * Context is the central storage for sharing business data during Feature execution.
 * **Completely separated from HTTP layer (req, res)**.
 *
 * Steps receive context, req, res as separate parameters:
 * ```javascript
 * module.exports = async (ctx, req, res) => {
 *   const userId = req.user?.id
 *   res.json({ success: true })
 * }
 * ```
 *
 * ## Structure
 *
 * Context contains only pure business data:
 * - Added from contextInitializer: `userId`, `sessionId` etc.
 * - Added directly in Step: `ctx.validated = true`
 * - Any field name can be used (no restrictions)
 *
 * ## Naming Conventions
 *
 * Recommendations for custom field naming:
 * - ✅ Use camelCase: `userId`, `orderData`, `sessionInfo`
 * - ✅ Meaningful names: `validatedInput`, `dbConnection`
 * - ✅ Use prefixes: `input*`, `output*`, `db*`
 *
 * ## Data Storage Method
 *
 * **How to store data in Step**:
 * ```javascript
 * // Store directly in ctx from Step function
 * module.exports = async (ctx, req, res) => {
 *   // Explicitly add field to ctx
 *   ctx.validated = true
 *   ctx.userData = { name: 'John', email: 'john@example.com' }
 *
 *   // Use only true/false/void for return (flow control)
 *   return true  // success
 * }
 * ```
 *
 * **Read data from other Steps**:
 * ```javascript
 * module.exports = async (ctx, req, res) => {
 *   // Access data stored in previous Step
 *   const validated = ctx.validated
 *   const userData = ctx.userData
 *
 *   // Store current Step data
 *   ctx.processedData = { ... }
 * }
 * ```
 *
 * @example
 * ```javascript
 * // ✅ Correct usage: Add initial data in contextInitializer
 * module.exports = numflow.feature({
 *   contextInitializer: (req, res) => ({
 *     userId: req.user?.id,         // ctx.userId
 *     orderData: req.body,          // ctx.orderData
 *     sessionId: req.session?.id,   // ctx.sessionId
 *   }),
 * })
 * ```
 *
 * @example
 * ```javascript
 * // ✅ Correct usage: Explicitly store data in Step
 * // 100-validate.js
 * module.exports = async (ctx, req, res) => {
 *   const userId = ctx.userId        // Added from contextInitializer
 *   const orderData = ctx.orderData
 *
 *   // Validation logic...
 *   const isValid = orderData && orderData.productId
 *
 *   if (!isValid) {
 *     res.status(400).json({ error: 'Invalid order data' })
 *     return  // void - Send error response
 *   }
 *
 *   // Explicitly store in ctx
 *   ctx.validated = true
 *   ctx.validatedData = {
 *     productId: orderData.productId,
 *     quantity: orderData.quantity || 1
 *   }
 *
 *   return true  // success
 * }
 *
 * // 200-process.js
 * module.exports = async (ctx, req, res) => {
 *   // Access data stored in previous Step
 *   const validated = ctx.validated        // true
 *   const validatedData = ctx.validatedData  // { productId, quantity }
 *
 *   // Process logic...
 *   const result = await processOrder(validatedData)
 *
 *   // Store current Step result
 *   ctx.orderResult = result
 *
 *   return true
 * }
 * ```
 *
 * @example
 * ```javascript
 * // ✅ JavaScript flexibility: Declare only needed parameters
 * // When only context is needed
 * module.exports = async (ctx) => {
 *   ctx.total = ctx.items.reduce((sum, item) => sum + item.price, 0)
 *   return true
 * }
 *
 * // When req is also needed
 * module.exports = async (ctx, req) => {
 *   const userId = req.user?.id
 *   ctx.userId = userId
 *   return true
 * }
 *
 * // When all are needed
 * module.exports = async (ctx, req, res) => {
 *   res.json({ success: true, data: ctx })
 * }
 * ```
 *
 * @example
 * ```javascript
 * // ❌ Incorrect usage: returning object (no longer auto-merged)
 * module.exports = async (ctx, req, res) => {
 *   return { validated: true }  // ❌ Now ignored! Not stored in ctx
 * }
 *
 * // ✅ Correct usage: Explicitly store in ctx
 * module.exports = async (ctx, req, res) => {
 *   ctx.validated = true    // ✅ Explicit storage
 *   return true             // Success indicator
 * }
 * ```
 */
export interface Context {
  /**
   * Custom fields (added by developer)
   *
   * @remarks
   * All fields from object returned by contextInitializer or
   * Fields added directly in Step are stored here.
   *
   * Example: userId, sessionId, orderData, validated, processedData etc.
   *
   * @example
   * ```javascript
   * // Add directly in Step
   * ctx.validated = true
   * ctx.userData = { name: 'John' }
   *
   * // Access from other Step
   * const validated = ctx.validated
   * const userData = ctx.userData
   * ```
   */
  [key: string]: any
}

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

/**
 * Async Task function type
 * Task executed asynchronously after transaction completion
 */
export type AsyncTaskFunction = (context: Context) => Promise<void> | void

/**
 * Step information
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

/**
 * Feature Error
 * Error that occurs during Feature execution
 *
 * @remarks
 * FeatureError wraps the original error to preserve all custom properties
 * (e.g., code, validationErrors, transactionId, etc.) via originalError reference.
 *
 * This allows:
 * - onError handler to access original error properties for retry logic
 * - Global error handler to extract all custom properties automatically
 * - No loss of custom error information during error wrapping
 *
 * @example
 * ```typescript
 * // Step throws BusinessError
 * throw new BusinessError('Out of stock', 'OUT_OF_STOCK')
 *
 * // AutoExecutor wraps it
 * const featureError = new FeatureError(
 *   err.message,
 *   err,  // originalError preserved!
 *   step,
 *   context,
 *   400
 * )
 *
 * // onError can access code via originalError
 * if (error.originalError instanceof BusinessError) {
 *   const code = error.originalError.code  // 'OUT_OF_STOCK'
 * }
 * ```
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

/**
 * Validation Error
 * Error that occurs when data validation fails
 */
export class ValidationError extends FeatureError {
  constructor(message: string, context?: Context) {
    super(message, undefined, undefined, context, 400)
    this.name = 'ValidationError'
  }
}
