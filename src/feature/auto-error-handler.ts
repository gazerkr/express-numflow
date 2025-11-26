/**
 * Auto-Error Handler
 *
 * Automatically handles errors that occur during Feature execution.
 * Simplified Express-style error handling.
 *
 * Key features:
 * 1. Error catching: Catches all errors that occur during Step execution
 * 2. HTTP response: Converts errors to appropriate HTTP responses
 * 3. Step info: Includes step information for debugging
 */

import { ServerResponse } from 'http'
import { FeatureError } from './types'

/**
 * Check if error is FeatureError (or duck-typed FeatureError)
 */
function isFeatureError(error: Error): error is FeatureError {
  if (error instanceof FeatureError) {
    return true
  }
  // Duck typing fallback
  return error.name === 'FeatureError' && typeof (error as any).statusCode === 'number'
}

/**
 * Auto-Error Handler class
 */
export class AutoErrorHandler {
  /**
   * Handle error and send HTTP response
   *
   * @param error - Error that occurred
   * @param res - HTTP Response object
   */
  static handle(error: Error, res: ServerResponse): void {
    // 1. Log error
    this.logError(error)

    // 2. Send HTTP response
    this.sendErrorResponse(error, res)
  }

  /**
   * Send HTTP error response
   *
   * Express-style: statusCode from error or 500
   *
   * @param error - Error that occurred
   * @param res - HTTP Response object
   */
  private static sendErrorResponse(error: Error, res: ServerResponse): void {
    // Get statusCode: FeatureError > error.statusCode > 500
    let statusCode = 500

    if (isFeatureError(error)) {
      statusCode = error.statusCode
    } else if (typeof (error as any).statusCode === 'number') {
      statusCode = (error as any).statusCode
    }

    const message = error.message || 'An unexpected error occurred'
    const isDev = process.env.NODE_ENV !== 'production'

    // Build response
    const response: any = {
      error: {
        message,
        statusCode,
      },
    }

    // Include step info if FeatureError
    if (isFeatureError(error) && error.step) {
      response.error.step = {
        number: error.step.number,
        name: error.step.name,
      }
    }

    // Include stack trace in development
    if (isDev && error.stack) {
      // Prefer original error stack for FeatureError
      const stack = isFeatureError(error) && error.originalError
        ? error.originalError.stack
        : error.stack
      response.error.stack = stack
    }

    // Send JSON response
    res.statusCode = statusCode
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(response))
  }

  /**
   * Log error
   *
   * @param error - Error that occurred
   */
  private static logError(error: Error): void {
    if (process.env.DISABLE_FEATURE_LOGS === 'true' || process.env.NODE_ENV === 'test') {
      return
    }
    console.error('[AutoErrorHandler] Error occurred:')
    console.error(`  Name: ${error.name}`)
    console.error(`  Message: ${error.message}`)

    if (isFeatureError(error) && error.step) {
      console.error(`  Step: ${error.step.number} (${error.step.name})`)
    }

    if (error.stack) {
      console.error(`  Stack: ${error.stack}`)
    }
  }
}
