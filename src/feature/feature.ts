/**
 * Feature-First Auto-Orchestration API
 *
 * Convention over Configuration:
 * - method: Auto-inferred from folder name (get/post/put/delete/patch)
 * - path: Auto-inferred from folder structure (/features/api/v1/orders/post -> /api/v1/orders)
 * - steps: Automatically detects ./steps folder
 * - asyncTasks: Automatically detects ./async-tasks folder
 *
 * numflow.feature() - Separate complex business logic into multiple steps and auto-execute
 *
 * @example
 * ```javascript
 * // /features/api/v1/orders/post/index.js
 * const numflow = require('numflow')
 *
 * module.exports = numflow.feature({
 *   // method, path, steps, asyncTasks are all auto-inferred!
 *   middlewares: [authenticate, authorize],
 *   contextInitializer: (ctx, req, res) => {
 *     ctx.userId = req.user?.id
 *     ctx.orderData = req.body
 *   },
 *   onError: async (error, ctx, req, res) => {
 *     if (ctx.dbClient) {
 *       await ctx.dbClient.query('ROLLBACK')
 *     }
 *     res.statusCode = 500
 *     res.end(JSON.stringify({ error: error.message }))
 *   },
 * })
 * ```
 */

import * as path from 'path'
import * as fs from 'fs'
import { fileURLToPath } from 'url'
import { IncomingMessage, ServerResponse } from 'http'
import {
  FeatureConfig,
  FeatureHandler,
  Context,
  StepInfo,
  AsyncTaskInfo,
  FeatureError,
} from './types'
import { Request, Response, NextFunction } from '../types/index'
import { AutoDiscovery } from './auto-discovery'
import { AutoExecutor } from './auto-executor'
import { AsyncTaskScheduler } from './async-task-scheduler'
import { FeatureExecutionError } from '../errors/index'
import { ConventionResolver } from './convention'
import { RETRY, isRetrySignal, RetrySignal } from './retry'

/**
 * Feature class
 * Creates HTTP request handler based on Feature configuration
 */
export class Feature {
  private readonly config: FeatureConfig
  private steps: StepInfo[] = []
  private asyncTasks: AsyncTaskInfo[] = []
  private initialized: boolean = false
  private basePath: string

  constructor(config: FeatureConfig, basePath: string) {
    this.config = config
    this.basePath = basePath
  }

  /**
   * Initialize Feature
   * Discover and load Step and Async Task files
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    const basePath = this.getBasePath()

    // 1. Discover Steps (optional)
    // Convention over Configuration: Only directory paths are supported
    if (this.config.steps && typeof this.config.steps === 'string') {
      const stepsPath = path.resolve(basePath, this.config.steps)

      if (fs.existsSync(stepsPath)) {
        const stepsDiscovery = new AutoDiscovery({
          directory: stepsPath,
          pattern: /^\d+-.*\.(js|ts|mjs|mts)$/,
          allowDuplicates: false,
        })

        this.steps = await stepsDiscovery.discoverSteps()
      }
    }

    // 2. Discover Async Tasks (optional)
    // Convention over Configuration: Only directory paths are supported
    if (this.config.asyncTasks && typeof this.config.asyncTasks === 'string') {
      const asyncTasksPath = path.resolve(basePath, this.config.asyncTasks)

      if (fs.existsSync(asyncTasksPath)) {
        const asyncTasksDiscovery = new AutoDiscovery({
          directory: asyncTasksPath,
          pattern: /.*\.(js|ts|mjs|mts)$/,
          allowDuplicates: true,
        })

        this.asyncTasks = await asyncTasksDiscovery.discoverAsyncTasks()
      }
    }

    this.initialized = true
  }

  /**
   * Execute Feature-level middlewares
   *
   * Feature middleware support
   * Executes Feature-level middlewares sequentially
   *
   * @param req - Request object
   * @param res - Response object
   */
  private async runFeatureMiddlewares(req: Request, res: Response): Promise<void> {
    const middlewares = this.config.middlewares || []

    if (middlewares.length === 0) {
      return
    }

    let index = 0

    return new Promise<void>((resolve, reject) => {
      const next: NextFunction = (error?: any) => {
        // Reject on error
        if (error) {
          reject(error)
          return
        }

        // End if response already sent
        if (res.headersSent) {
          resolve()
          return
        }

        // All middlewares executed
        if (index >= middlewares.length) {
          resolve()
          return
        }

        // Execute next middleware
        const middleware = middlewares[index++]

        try {
          const result = middleware(req, res, next)

          // Handle Promise
          if (result instanceof Promise) {
            result.catch(reject)
          }
        } catch (error) {
          reject(error)
        }
      }

      // Execute first middleware
      next()
    })
  }

  /**
   * Create Feature handler
   *
   * @returns HTTP request handler
   */
  getHandler(): FeatureHandler {
    return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
      // Check initialization
      if (!this.initialized) {
        await this.initialize()
      }

      // Execute Feature middlewares
      // Execution order: Global middlewares (executed in Application) → Feature middlewares → contextInitializer → Steps
      // Middleware errors are passed to Global Error Handler
      await this.runFeatureMiddlewares(req as Request, res as Response)

      // End if response already sent by middleware
      if (res.headersSent) {
        return
      }

      // Initialize Context (pure business data only)
      const context: Context = {}

      // Execute custom Context initializer (optional)
      if (this.config.contextInitializer) {
        await this.config.contextInitializer(context, req, res)
      }

      // Retry loop
      const MAX_TOTAL_RETRIES = 10
      let retryCount = 0

      while (retryCount <= MAX_TOTAL_RETRIES) {
        try {
          // Execute Steps (pass req, res as separate parameters)
          const executor = new AutoExecutor({
            steps: this.steps,
            context,
            req,
            res,
          })

          await executor.execute()

          // Schedule Async Tasks (after success)
          if (this.asyncTasks.length > 0) {
            const scheduler = new AsyncTaskScheduler(this.asyncTasks, context)
            scheduler.schedule()
          }

          // Success - end
          return
        } catch (error) {
          // Call custom error handler if exists
          if (this.config.onError) {
            const result = await this.config.onError(error as Error, context, req, res)

            // Check for Retry signal
            if (isRetrySignal(result)) {
              retryCount++

              // Check options if RetrySignal object
              if (result !== RETRY) {
                const signal = result as RetrySignal

                // Check maxAttempts
                if (signal.maxAttempts !== undefined && retryCount >= signal.maxAttempts) {
                  // Max retry attempts reached
                  if (!res.headersSent) {
                    res.statusCode = 503
                    res.setHeader('Content-Type', 'application/json')
                    res.end(JSON.stringify({ error: 'Max retry attempts exceeded' }))
                  }
                  return
                }

                // Apply delay
                if (signal.delay && signal.delay > 0) {
                  await new Promise(resolve => setTimeout(resolve, signal.delay))
                }
              }

              // Retry
              continue
            }

            // End normally if not Retry signal (onError handles response)
            return
          }

          // Pass to Global Error Handler if no custom error handler
          // Wrap with FeatureExecutionError
          let step: { number: number; name: string } | undefined = undefined

          // Extract step info if FeatureError
          if (error instanceof FeatureError && error.step) {
            step = {
              number: error.step.number,
              name: error.step.name
            }
          }

          throw new FeatureExecutionError(error as Error, step)
        }
      }

      // Max total retry attempts exceeded
      if (!res.headersSent) {
        res.statusCode = 503
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'Max total retry attempts exceeded' }))
      }
    }
  }

  /**
   * Get base path
   * Directory path of Feature configuration file
   */
  private getBasePath(): string {
    return this.basePath
  }

  /**
   * Get Feature information
   */
  getInfo() {
    return {
      method: this.config.method,
      path: this.config.path,
      steps: this.steps.length,
      asyncTasks: this.asyncTasks.length,
      hasErrorHandler: !!this.config.onError,
    }
  }
}

/**
 * numflow.feature() - Feature creation factory function
 *
 * @param config - Feature configuration
 * @returns Feature instance
 *
 * @example
 * ```javascript
 * // Convention over Configuration - auto-inference
 * // /features/api/v1/orders/post/index.js
 * const numflow = require('numflow')
 *
 * module.exports = numflow.feature({
 *   // method, path, steps, asyncTasks are all auto-inferred!
 *   middlewares: [authenticate, authorize],
 *   contextInitializer: (ctx, req, res) => {
 *     ctx.userId = req.user?.id
 *     ctx.orderData = req.body
 *   },
 *   onError: async (error, ctx, req, res) => {
 *     // Handle errors manually (transaction rollback, logging, etc.)
 *     if (ctx.txId) {
 *       await db.rollback(ctx.txId)
 *     }
 *     console.error('Order creation failed:', error)
 *     res.statusCode = 500
 *     res.setHeader('Content-Type', 'application/json')
 *     res.end(JSON.stringify({ error: error.message }))
 *   },
 * })
 *
 * // Manual configuration is also possible (override Convention)
 * module.exports = numflow.feature({
 *   method: 'POST',
 *   path: '/api/orders',
 *   steps: './steps',
 *   asyncTasks: './async-tasks',
 *   // ...
 * })
 * ```
 */
export function feature(config: FeatureConfig = {}): Feature {
  // Get caller's file path
  let callerPath = ConventionResolver.getCallerPath()

  // Convert file:// URL to filesystem path (ESM support)
  if (callerPath.startsWith('file://')) {
    callerPath = fileURLToPath(callerPath)
  }

  let conventions: {
    method?: any
    path?: any
    steps?: string | null
    asyncTasks?: string | null
  } = {
    method: undefined,
    path: undefined,
    steps: null,
    asyncTasks: null,
  }

  let basePath = path.dirname(callerPath)
  let conventionError: Error | null = null

  // Try to resolve conventions from folder structure
  try {
    conventions = ConventionResolver.resolveConventions(callerPath)
  } catch (error) {
    // Convention resolution failed (e.g., outside of features/ directory)
    // Save error for later warning if no explicit method/path is provided
    conventionError = error as Error
    basePath = process.cwd()
  }

  // Merge with user config (user config takes priority)
  const mergedConfig: FeatureConfig = {
    method: config.method || conventions.method,
    path: config.path || conventions.path,
    steps: config.steps || conventions.steps || undefined,
    asyncTasks: config.asyncTasks || conventions.asyncTasks || undefined,
    middlewares: config.middlewares,
    contextInitializer: config.contextInitializer,
    onError: config.onError,
  }

  // Validate that method and path are provided
  // If Convention resolution failed and user didn't provide explicit method/path, show warning
  if (!mergedConfig.method || !mergedConfig.path) {
    if (conventionError) {
      // Convention resolution failed AND user didn't provide explicit method/path
      console.warn(
        `[express-numflow] Warning: Feature created without method or path.\n` +
        `  Location: ${callerPath}\n` +
        `  Reason: ${conventionError.message}\n` +
        `  Solution: Either:\n` +
        `    1. Move this file to a 'features/' directory structure (e.g., features/api/users/@post/index.js)\n` +
        `    2. Provide explicit method and path:\n` +
        `       feature({ method: 'POST', path: '/api/users', ... })\n` +
        `  Note: This Feature will not be registrable until method and path are provided.`
      )
    } else {
      // Convention resolution succeeded but method/path still missing (should not happen)
      console.warn(
        `[express-numflow] Warning: Feature created without method or path.\n` +
        `  Location: ${callerPath}\n` +
        `  Please provide explicit method and path:\n` +
        `    feature({ method: 'POST', path: '/api/users', ... })`
      )
    }
  }

  return new Feature(mergedConfig, basePath)
}

// Export all types
export * from './types'
export { AutoDiscovery } from './auto-discovery'
export { AutoExecutor } from './auto-executor'
export { AutoErrorHandler } from './auto-error-handler'
export { AsyncTaskScheduler } from './async-task-scheduler'
export { ConventionResolver } from './convention'
export { FeatureScanner, scanFeatures, ScannedFeature, ScanOptions } from './feature-scanner'
export { retry, RETRY, isRetrySignal, RetrySignal } from './retry'
