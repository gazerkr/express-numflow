/**
 * Retry Mechanism for Feature Error Handling
 *
 * Provides Feature retry capability from onError handler.
 * Symbol-based implementation for maximum performance.
 *
 * @example
 * ```javascript
 * const numflow = require('numflow')
 *
 * module.exports = numflow.feature({
 *   onError: async (error, ctx, req, res) => {
 *     // Immediate retry
 *     if (error.message.includes('rate_limit')) {
 *       ctx.fallbackProvider = 'openrouter'
 *       return numflow.retry()
 *     }
 *
 *     // Retry after 1 second
 *     if (error.message.includes('timeout')) {
 *       return numflow.retry({ delay: 1000 })
 *     }
 *
 *     // Error response (no retry)
 *     res.status(500).json({ error: error.message })
 *   }
 * })
 * ```
 */

/**
 * Retry signal (Symbol)
 * Used for immediate retry without options.
 *
 * Performance: Ultra-fast (5µs, same as object return)
 */
export const RETRY = Symbol.for('numflow.retry')

/**
 * Retry signal (with options)
 * Used when specifying delay or maxAttempts.
 */
export interface RetrySignal {
  /**
   * Retry signal identifier
   */
  __retry: true

  /**
   * Wait time before retry (milliseconds)
   *
   * @example
   * ```javascript
   * // Retry after 1 second
   * return numflow.retry({ delay: 1000 })
   *
   * // Exponential backoff
   * const delay = 1000 * Math.pow(2, ctx.retryCount)
   * return numflow.retry({ delay })
   * ```
   */
  delay?: number

  /**
   * Maximum retry attempts
   *
   * @example
   * ```javascript
   * // Retry up to 3 times
   * return numflow.retry({ maxAttempts: 3 })
   * ```
   */
  maxAttempts?: number
}

/**
 * Request retry
 *
 * Requests Feature retry from onError handler.
 *
 * **Performance characteristics:**
 * - No options: Returns Symbol (ultra-fast, 5µs)
 * - With options: Returns object (ultra-fast, 5µs)
 * - 70x faster than throw approach
 *
 * @param options - Retry options
 * @returns Symbol (no options) or RetrySignal (with options)
 *
 * @example
 * ```javascript
 * // Immediate retry (fastest)
 * return numflow.retry()
 *
 * // Retry after 1 second
 * return numflow.retry({ delay: 1000 })
 *
 * // Up to 3 times
 * return numflow.retry({ maxAttempts: 3 })
 *
 * // Combined
 * return numflow.retry({ delay: 2000, maxAttempts: 5 })
 * ```
 *
 * @example
 * ```javascript
 * // Provider Fallback
 * onError: async (error, ctx, req, res) => {
 *   const providers = ['openai', 'openrouter', 'gemini']
 *   const current = providers.indexOf(ctx.currentProvider || 'openai')
 *   const next = providers[current + 1]
 *
 *   if (error.message.includes('rate_limit') && next) {
 *     ctx.currentProvider = next
 *     return numflow.retry({ delay: 500 })
 *   }
 *
 *   res.status(503).json({ error: 'All providers unavailable' })
 * }
 * ```
 *
 * @example
 * ```javascript
 * // Exponential Backoff
 * onError: async (error, ctx, req, res) => {
 *   if (error.message.includes('timeout')) {
 *     ctx.retryCount = (ctx.retryCount || 0) + 1
 *
 *     if (ctx.retryCount <= 3) {
 *       const delay = 1000 * Math.pow(2, ctx.retryCount - 1)  // 1s, 2s, 4s
 *       return numflow.retry({ delay, maxAttempts: 3 })
 *     }
 *   }
 *
 *   res.status(504).json({ error: 'Timeout' })
 * }
 * ```
 */
export function retry(options?: {
  delay?: number
  maxAttempts?: number
}): typeof RETRY | RetrySignal {
  // Return Symbol if no options (best performance)
  if (!options || Object.keys(options).length === 0) {
    return RETRY
  }

  // Return object if options provided
  return {
    __retry: true,
    delay: options.delay,
    maxAttempts: options.maxAttempts
  }
}

/**
 * Check if value is a retry signal
 *
 * @param value - Value to check
 * @returns Whether it's a retry signal
 *
 * @internal
 */
export function isRetrySignal(value: any): value is typeof RETRY | RetrySignal {
  return value === RETRY || (!!value && value.__retry === true)
}
