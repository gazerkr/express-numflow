/**
 * HTTP Error Classes
 *
 * Unified error handling
 * Error type definitions for regular routes and Feature-First
 */

/**
 * HTTP error base class
 */
export class HttpError extends Error {
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly suggestion?: string
  public readonly docUrl?: string

  constructor(
    message: string,
    statusCode: number,
    options?: {
      suggestion?: string
      docUrl?: string
    }
  ) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.isOperational = true // Expected error (won't crash server)
    this.suggestion = options?.suggestion
    this.docUrl = options?.docUrl

    // Remove constructor from stack trace
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * 400 Bad Request - Invalid request
 */
export class ValidationError extends HttpError {
  public readonly validationErrors?: Record<string, string[]>

  constructor(message: string = 'Validation failed', validationErrors?: Record<string, string[]>) {
    super(message, 400, {
      suggestion: validationErrors
        ? 'Check the validationErrors field for details on which fields failed validation.'
        : 'Verify that all required fields are present and have valid values.',
      docUrl: 'https://numflow.dev/docs/errors#validation-error',
    })
    this.validationErrors = validationErrors
  }
}

/**
 * 400 Bad Request - Business logic error
 */
export class BusinessError extends HttpError {
  public readonly code?: string

  constructor(message: string, code?: string) {
    super(message, 400, {
      suggestion: 'Review your request data and ensure it meets the business logic requirements.',
      docUrl: 'https://numflow.dev/docs/errors#business-error',
    })
    this.code = code
  }
}

/**
 * 401 Unauthorized - Authentication failed
 */
export class UnauthorizedError extends HttpError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, {
      suggestion: 'Include valid authentication credentials in your request (e.g., Authorization header with a valid token).',
      docUrl: 'https://numflow.dev/docs/errors#unauthorized-error',
    })
  }
}

/**
 * 403 Forbidden - Permission denied
 */
export class ForbiddenError extends HttpError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, {
      suggestion: 'Ensure your account has the necessary permissions to access this resource.',
      docUrl: 'https://numflow.dev/docs/errors#forbidden-error',
    })
  }
}

/**
 * 404 Not Found - Resource not found
 */
export class NotFoundError extends HttpError {
  constructor(message: string = 'Not found') {
    super(message, 404, {
      suggestion: 'Check the URL path and ensure the requested resource exists.',
      docUrl: 'https://numflow.dev/docs/errors#not-found-error',
    })
  }
}

/**
 * 409 Conflict - Conflict
 */
export class ConflictError extends HttpError {
  constructor(message: string = 'Conflict') {
    super(message, 409, {
      suggestion: 'The request conflicts with the current state of the resource. Resolve the conflict and try again.',
      docUrl: 'https://numflow.dev/docs/errors#conflict-error',
    })
  }
}

/**
 * 413 Payload Too Large - Request body size exceeded
 */
export class PayloadTooLargeError extends HttpError {
  constructor(message: string = 'Payload too large') {
    super(message, 413, {
      suggestion: 'Reduce the size of your request body or increase the server limit using bodyParser options.',
      docUrl: 'https://numflow.dev/docs/errors#payload-too-large-error',
    })
  }
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 */
export class TooManyRequestsError extends HttpError {
  public readonly retryAfter?: number

  constructor(message: string = 'Too many requests', retryAfter?: number) {
    super(message, 429, {
      suggestion: retryAfter
        ? `Rate limit exceeded. Please retry after ${retryAfter} seconds.`
        : 'Rate limit exceeded. Please wait before sending more requests.',
      docUrl: 'https://numflow.dev/docs/errors#too-many-requests-error',
    })
    this.retryAfter = retryAfter
  }
}

/**
 * 500 Internal Server Error - Server internal error
 */
export class InternalServerError extends HttpError {
  constructor(message: string = 'Internal server error') {
    super(message, 500, {
      suggestion: 'An unexpected error occurred on the server. Please try again later or contact support if the issue persists.',
      docUrl: 'https://numflow.dev/docs/errors#internal-server-error',
    })
  }
}

/**
 * 501 Not Implemented - Not implemented
 */
export class NotImplementedError extends HttpError {
  constructor(message: string = 'Not implemented') {
    super(message, 501, {
      suggestion: 'This feature is not yet implemented. Please check the documentation for available features.',
      docUrl: 'https://numflow.dev/docs/errors#not-implemented-error',
    })
  }
}

/**
 * 503 Service Unavailable - Service unavailable
 */
export class ServiceUnavailableError extends HttpError {
  constructor(message: string = 'Service unavailable') {
    super(message, 503, {
      suggestion: 'The service is temporarily unavailable. Please try again in a few moments.',
      docUrl: 'https://numflow.dev/docs/errors#service-unavailable-error',
    })
  }
}

/**
 * Check if error is HttpError
 */
export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError
}

/**
 * Check if error is Operational Error (expected error)
 */
export function isOperationalError(error: unknown): boolean {
  if (error instanceof HttpError) {
    return error.isOperational
  }
  return false
}

/**
 * Feature execution error
 *
 * Wraps errors that occurred during Feature Step execution to provide additional information
 */
export class FeatureExecutionError extends HttpError {
  public readonly originalError: Error
  public readonly step?: {
    number: number
    name: string
  }

  constructor(originalError: Error, step?: { number: number; name: string }) {
    // Keep status code if original error is HttpError, otherwise 500
    const statusCode = originalError instanceof HttpError ? originalError.statusCode : 500

    const suggestion = step
      ? `Error occurred in step ${step.number} (${step.name}). Check the step implementation and ensure all dependencies are available.`
      : 'Error occurred during feature execution. Review your step implementations and error handling.'

    super(originalError.message, statusCode, {
      suggestion,
      docUrl: 'https://numflow.dev/docs/errors#feature-execution-error',
    })
    this.name = 'FeatureExecutionError'
    this.originalError = originalError
    this.step = step
  }
}
