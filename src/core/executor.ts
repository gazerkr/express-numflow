/**
 * Generic Executor
 *
 * A generic execution engine that sequentially executes Steps regardless of trigger type.
 *
 * Key features:
 * 1. Sequential execution: Executes Steps in numerical order
 * 2. Context sharing: All Steps share the same Context object
 * 3. Error handling: Immediately stops when an error occurs during Step execution
 * 4. Execution logging: Records logs before and after each Step execution
 */

import {
  StepInfo,
  Context,
  ExecutorOptions,
  StepExecutionStats,
  FeatureError,
} from './types'

/**
 * Generic Executor class
 *
 * @template TTrigger - Trigger type
 * @template TResponder - Responder type
 */
export class GenericExecutor<TTrigger = any, TResponder = any> {
  private readonly options: ExecutorOptions<TTrigger, TResponder>
  private readonly stats: StepExecutionStats[] = []
  private readonly totalStartTime: number = Date.now()

  /**
   * Debug mode caching (performance optimization)
   */
  /* istanbul ignore next - Debug mode detection is only executed at module load time */
  private static readonly isDebugMode = (() => {
    if (process.env.NODE_ENV === 'test') {
      return false
    }
    if (process.env.FEATURE_LOGS === 'true') {
      return true
    }
    if (process.env.FEATURE_LOGS === 'false') {
      return false
    }
    return process.env.NODE_ENV === 'development'
  })()

  constructor(options: ExecutorOptions<TTrigger, TResponder>) {
    this.options = options
  }

  /**
   * Execute all Steps sequentially
   *
   * @returns Completed Context
   * @throws {FeatureError} When an error occurs during Step execution
   */
  async execute(): Promise<Context> {
    const { steps, context, trigger, responder, isCompleted } = this.options

    if (steps.length === 0) {
      return context
    }

    // Feature start header
    this.logHeader()

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]
      const startTime = GenericExecutor.isDebugMode ? Date.now() : 0

      try {
        // Execute Step function
        await step.fn(context, trigger, responder)

        // Process statistics/logs only in debug mode
        /* istanbul ignore if - Debug mode is always false in test environment */
        if (GenericExecutor.isDebugMode) {
          const duration = Date.now() - startTime
          this.stats.push({
            stepNumber: step.number,
            stepName: step.name,
            success: true,
            duration,
          })
          this.logStep(step, duration, true)
        }

        // Check ctx.__stop (flow stop request from Step)
        if (context.__stop) {
          this.logSummary(true)
          return context
        }

        // Check completion (response sent, etc.)
        if (isCompleted && isCompleted()) {
          this.logSummary(true)
          return context
        }
      } catch (error) {
        // Process error statistics/logs
        /* istanbul ignore if - Debug mode is always false in test environment */
        if (GenericExecutor.isDebugMode) {
          const duration = Date.now() - startTime
          this.stats.push({
            stepNumber: step.number,
            stepName: step.name,
            success: false,
            duration,
            error: error as Error,
          })
          this.logStep(step, duration, false, error as Error)
        }

        // Wrap FeatureError
        if (error instanceof FeatureError) {
          this.logSummary(false, error)
          throw error
        }

        const err = error as Error
        const statusCode = (err as any).statusCode || 500
        const featureError = new FeatureError(
          err.message,
          err,
          step,
          context,
          statusCode
        )

        this.logSummary(false, featureError)
        throw featureError
      }
    }

    this.logSummary(true)
    return context
  }

  /**
   * Output Feature start header
   */
  /* istanbul ignore next - Only executed in debug mode */
  private logHeader(): void {
    if (!GenericExecutor.isDebugMode) {
      return
    }

    const header = this.options.logHeader || '[Feature]'
    console.log(`\n${header}`)
  }

  /**
   * Output Step detail log
   */
  /* istanbul ignore next - Only executed in debug mode */
  private logStep(
    step: StepInfo,
    duration: number,
    success: boolean,
    error?: Error
  ): void {
    if (!GenericExecutor.isDebugMode) {
      return
    }

    const statusIcon = success ? '[OK]' : '[FAIL]'
    const stepName = step.name.replace(/^\d+-/, '').replace(/\.(js|ts)$/, '')

    console.log(`  [Step ${step.number}] ${stepName} (${duration}ms) ${statusIcon}`)

    if (!success && error) {
      console.log(`    Error: ${error.message}`)
    }
  }

  /**
   * Output overall Summary
   */
  /* istanbul ignore next - Only executed in debug mode */
  private logSummary(success: boolean, finalError?: Error): void {
    if (!GenericExecutor.isDebugMode) {
      return
    }

    const totalDuration = Date.now() - this.totalStartTime
    const totalSteps = this.stats.length
    const successCount = this.stats.filter(s => s.success).length

    console.log(`  [Summary]`)
    console.log(`    Total: ${totalDuration}ms`)
    console.log(`    Steps: ${successCount}/${totalSteps} passed`)

    if (!success && finalError) {
      console.log(`    Status: [FAIL]`)
      console.log(`    Error: ${finalError.message}`)
    } else if (success) {
      console.log(`    Status: [OK]`)
    }

    console.log('')
  }
}

/**
 * Steps execution helper function
 */
export async function executeSteps<TTrigger = any, TResponder = any>(
  options: ExecutorOptions<TTrigger, TResponder>
): Promise<Context> {
  const executor = new GenericExecutor(options)
  return executor.execute()
}
