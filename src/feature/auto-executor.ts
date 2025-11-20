/**
 * Auto-Execution Engine
 *
 * Automatically executes Steps sequentially.
 *
 * Key features:
 * 1. Sequential execution: Executes Steps in number order
 * 2. Context sharing: All steps share the same context object
 * 3. Error handling: Stops immediately when error occurs during Step execution
 * 4. Transaction integration: Integrates with Transaction Manager for transaction management
 * 5. Execution logging: Records logs before and after each step execution
 */

import { StepInfo, Context, AutoExecutionOptions, FeatureError } from './types'
import { hasStatusCode } from '../utils/type-guards'
import { createAsyncResponseProxy, AsyncResponseTracker } from '../utils/async-response-proxy'

/**
 * Step execution statistics
 */
interface StepExecutionStats {
  stepNumber: number
  stepName: string
  success: boolean
  duration: number
  error?: Error
  contextBefore?: any
  contextAfter?: any
}

/**
 * Auto-Execution Engine class
 */
export class AutoExecutor {
  private readonly options: AutoExecutionOptions
  private readonly stats: StepExecutionStats[] = []
  private readonly totalStartTime: number = Date.now()

  /**
   * Debug mode caching (performance optimization)
   * Check environment variable only once at class load instead of every step
   *
   * Logging policy (simple rules):
   *
   * 1. Test environment: Always OFF (for clean test output)
   *    - NODE_ENV=test → No logs
   *
   * 2. Explicit control (highest priority):
   *    - FEATURE_LOGS=true → Force ON (any environment except test)
   *    - FEATURE_LOGS=false → Force OFF (any environment)
   *
   * 3. Default behavior (when FEATURE_LOGS not set):
   *    - development → ON (helpful for debugging)
   *    - production → OFF (clean production logs)
   *
   * Examples:
   * - Local dev: (no env vars) → Logs ON
   * - Local dev (quiet): FEATURE_LOGS=false → Logs OFF
   * - Production debug: FEATURE_LOGS=true → Logs ON
   * - Production normal: (no env vars) → Logs OFF
   */
  private static readonly isDebugMode = (() => {
    // Test environment: always OFF
    if (process.env.NODE_ENV === 'test') {
      return false
    }

    // Explicit control (highest priority)
    if (process.env.FEATURE_LOGS === 'true') {
      return true
    }
    if (process.env.FEATURE_LOGS === 'false') {
      return false
    }

    // Default: ON in development, OFF in production
    return process.env.NODE_ENV === 'development'
  })()

  constructor(options: AutoExecutionOptions) {
    this.options = options
  }

  /**
   * Execute all Steps sequentially
   *
   * @returns Completed Context (pure business data only)
   * @throws {FeatureError} When error occurs during Step execution
   */
  async execute(): Promise<Context> {
    // Performance optimization: Remove destructuring, direct access
    const steps = this.options.steps
    const context = this.options.context
    const req = this.options.req
    const res = this.options.res

    if (steps.length === 0) {
      throw new Error('No steps to execute')
    }

    // Create async response tracker
    const asyncTracker: AsyncResponseTracker = {
      pending: false,
      promise: null,
    }

    // Wrap response object with Proxy to track async methods
    const wrappedRes = createAsyncResponseProxy(res, asyncTracker)

    // Feature start header
    this.logHeader(req)

    // Performance optimization: for-of → for loop (remove Iterator overhead)
    // Performance optimization: executeStep inline (remove method call overhead)
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]

      // --- executeStep logic start (inline) ---
      const startTime = AutoExecutor.isDebugMode ? Date.now() : 0
      let contextBefore: any

      // Context snapshot only in Debug Mode (before execution)
      if (AutoExecutor.isDebugMode) {
        contextBefore = this.cloneContext(context)
      }

      try {
        // Execute Step function with proxied response
        await step.fn(context, req, wrappedRes)

        // Statistics and log processing only in Debug Mode
        if (AutoExecutor.isDebugMode) {
          const duration = Date.now() - startTime
          const contextAfter = this.cloneContext(context)

          // Store statistics
          this.stats.push({
            stepNumber: step.number,
            stepName: step.name,
            success: true,
            duration,
            contextBefore,
            contextAfter,
          })

          // Step detail log
          this.logStep(step, duration, true, contextBefore, contextAfter)
        }

        // Performance optimization: res.headersSent check (early response detection)
        if (res.headersSent) {
          this.logSummary(true)
          return context
        }

        // 🔧 CRITICAL FIX: Wait for async response before proceeding to next step
        // This prevents "Cannot set headers after they are sent" errors when:
        // - Step 200: res.render() (async, returns immediately)
        // - Step 300: res.redirect() (would try to set headers while Step 200 is still rendering)
        if (asyncTracker.pending && asyncTracker.promise) {
          await asyncTracker.promise

          // After async operation completes, check if response was sent
          if (res.headersSent) {
            this.logSummary(true)
            return context
          }
        }

      } catch (error) {
        // Error statistics and log processing only in Debug Mode
        if (AutoExecutor.isDebugMode) {
          const duration = Date.now() - startTime

          // Store statistics (failure)
          this.stats.push({
            stepNumber: step.number,
            stepName: step.name,
            success: false,
            duration,
            error: error as Error,
            contextBefore,
          })

          // Step error log
          this.logStep(step, duration, false, contextBefore, undefined, error as Error)
        }

        // Wrap FeatureError (include step info)
        if (error instanceof FeatureError) {
          // Output Summary then throw error
          this.logSummary(false, error as Error)
          throw error
        }

        // Wrap generic Error as FeatureError
        // Preserve originalError to prevent loss of custom properties (code, validationErrors, etc.)
        const err = error as Error
        const statusCode = hasStatusCode(err) ? err.statusCode : 500
        const featureError = new FeatureError(
          err.message,
          err,  // Preserve original error as originalError
          step,
          context,
          statusCode
        )

        // Output Summary then throw error
        this.logSummary(false, featureError)
        throw featureError
      }
      // --- executeStep logic end (inline) ---
    }

    // Wait for async response methods (res.render, res.download, res.sendFile) to complete
    if (asyncTracker.pending && asyncTracker.promise) {
      await asyncTracker.promise
    }

    // Error if response not sent after all steps completed
    if (res && 'headersSent' in res && !res.headersSent) {
      throw new Error(
        'Feature completed without sending a response. ' +
        'Make sure to call res.json(), res.send(), res.end(), or similar in your steps.'
      )
    }

    // Output Summary
    this.logSummary(true)

    return context
  }

  /**
   * Output Feature start header
   */
  private logHeader(req?: any): void {
    // Performance optimization: use static cached isDebugMode
    if (!AutoExecutor.isDebugMode) {
      return
    }

    const method = req?.method || 'UNKNOWN'
    const path = req?.url || 'UNKNOWN'

    console.log(`\n[Feature] ${method} ${path}`)
  }

  /**
   * Output Step detail log
   */
  private logStep(
    step: StepInfo,
    duration: number,
    success: boolean,
    contextBefore?: any,
    contextAfter?: any,
    error?: Error
  ): void {
    // Performance optimization: use static cached isDebugMode
    if (!AutoExecutor.isDebugMode) {
      return
    }

    const statusIcon = success ? '✓' : '✗'
    const stepName = step.name.replace(/^\d+-/, '').replace(/\.(js|ts)$/, '')

    // Step header
    console.log(`  [Step ${step.number}] ${stepName} (${duration}ms) ${statusIcon}`)

    // Input (context before)
    if (contextBefore) {
      const inputData = this.formatContextForDisplay(contextBefore, 'input')
      if (inputData) {
        console.log(`    ├─ Input: ${inputData}`)
      }
    }

    // Output (context changes)
    if (success && contextAfter) {
      const changes = this.formatContextDiff(contextBefore, contextAfter)
      if (changes) {
        console.log(`    └─ Context: ${changes}`)
      } else {
        console.log(`    └─ Context: (no changes)`)
      }
    }

    // Error
    if (!success && error) {
      console.log(`    └─ Error: ${error.message}`)
    }

    console.log('')
  }

  /**
   * Output overall Summary
   */
  private logSummary(success: boolean, finalError?: Error): void {
    // Performance optimization: use static cached isDebugMode
    if (!AutoExecutor.isDebugMode) {
      return
    }

    const totalDuration = Date.now() - this.totalStartTime
    const totalSteps = this.stats.length
    const successCount = this.stats.filter(s => s.success).length

    console.log(`  [Summary]`)
    console.log(`    Total: ${totalDuration}ms`)
    console.log(`    Steps: ${successCount}/${totalSteps} passed`)

    if (!success && finalError) {
      console.log(`    Status: ✗ Failed`)
      console.log(`    Error: ${finalError.message}`)
    } else if (success) {
      console.log(`    Status: ✓ Success`)
    }

    console.log('')
  }

  /**
   * Clone Context (deep copy)
   */
  private cloneContext(context: Context): any {
    try {
      // Copy excluding req, res
      const { req, res, ...rest } = context
      return JSON.parse(JSON.stringify(rest))
    } catch (error) {
      // Return empty object if failed due to circular reference, etc.
      return {}
    }
  }

  /**
   * Format Context changes (before → after)
   */
  private formatContextDiff(before: any, after: any): string {
    try {
      // Track only results changes
      const beforeResults = before.results || {}
      const afterResults = after.results || {}

      // Newly added keys
      const newKeys = Object.keys(afterResults).filter(key => !(key in beforeResults))

      if (newKeys.length === 0) {
        return ''
      }

      // Display only newly added data
      const newData: any = {}
      newKeys.forEach(key => {
        newData[key] = afterResults[key]
      })

      return this.formatObject(newData, 60)
    } catch (error) {
      return '(unable to display)'
    }
  }

  /**
   * Format Context for display
   */
  private formatContextForDisplay(context: any, type: 'input' | 'output'): string {
    try {
      if (type === 'input') {
        // Input: Display key fields excluding results
        const { results, req, res, ...rest } = context

        if (Object.keys(rest).length === 0) {
          return '(empty)'
        }

        return this.formatObject(rest, 60)
      }

      return ''
    } catch (error) {
      return '(unable to display)'
    }
  }

  /**
   * Format object to string (with length limit)
   */
  private formatObject(obj: any, maxLength: number = 80): string {
    try {
      const str = JSON.stringify(obj)

      if (str.length <= maxLength) {
        return str
      }

      // Abbreviate if exceeds length limit
      return str.substring(0, maxLength - 3) + '...'
    } catch (error) {
      return '(complex object)'
    }
  }
}

