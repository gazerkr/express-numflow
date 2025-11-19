/**
 * Auto-Error Handler
 *
 * Automatically handles errors that occur during Feature execution.
 *
 * Key features:
 * 1. Error catching: Catches all errors that occur during Step execution
 * 2. HTTP response: Converts errors to appropriate HTTP responses
 * 3. Error logging: Logs error information
 */

import { ServerResponse } from 'http'
import { FeatureError, ValidationError } from './types'

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
   * @param error - Error that occurred
   * @param res - HTTP Response object
   */
  private static sendErrorResponse(error: Error, res: ServerResponse): void {
    let statusCode = 500
    let errorName = 'InternalServerError'
    let errorMessage = 'An unexpected error occurred'
    let details: any = {}

    // Handle FeatureError
    if (error instanceof FeatureError) {
      statusCode = error.statusCode
      errorName = error.name
      errorMessage = error.message

      if (error.step) {
        details.step = {
          number: error.step.number,
          name: error.step.name,
        }
      }
    }
    // Handle ValidationError
    else if (error instanceof ValidationError) {
      statusCode = 400
      errorName = 'ValidationError'
      errorMessage = error.message
    }
    // Handle generic Error
    else {
      statusCode = 500
      errorName = 'Error'
      errorMessage = error.message || 'An unexpected error occurred'
    }

    // Send JSON response
    res.statusCode = statusCode
    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        success: false,
        error: errorName,
        message: errorMessage,
        details: Object.keys(details).length > 0 ? details : undefined,
        // Include stack trace only in development environment
        ...(process.env.NODE_ENV === 'development' && {
          stack: error.stack,
        }),
      })
    )
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

    if (error instanceof FeatureError && error.step) {
      console.error(`  Step: ${error.step.number} (${error.step.name})`)
    }

    if (error.stack) {
      console.error(`  Stack: ${error.stack}`)
    }
  }
}
