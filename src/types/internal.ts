/**
 * Internal Types
 *
 * Extended type definitions used internally by the framework
 * Not exposed to external API, types to eliminate `as any` usage
 *
 * @internal
 */

// Application and Router are not used in express-numflow
// import type { Application } from '../application'
// import type { Router } from '../router'

/**
 * Internal Request
 *
 * Node.js IncomingMessage + Express-compatible extensions + Internal fields
 */
export interface InternalRequest {
  /**
   * Route parameters
   * Example: /users/:id → { id: '123' }
   */
  params?: Record<string, string>

  /**
   * Query string parameters
   * Example: /users?name=john → { name: 'john' }
   */
  query?: Record<string, any>

  /**
   * Handler execution promise
   * Used in Router - tracks asynchronous execution of handler chain
   *
   * @internal
   */
  __handlerPromise?: Promise<void>
}

/**
 * Internal Response
 *
 * Node.js ServerResponse + Express-compatible extensions + Internal fields
 */
export interface InternalResponse {
  /**
   * Request reference
   * Allows access to Request from Response
   */
  req?: any

  /**
   * Application reference
   * Allows access to Application settings from Response
   */
  app?: any
}

/**
 * Internal Socket
 *
 * Node.js Socket + IP/Protocol related extension fields
 */
export interface InternalSocket {
  /**
   * Encrypted connection flag
   * Indicates whether connection is HTTPS
   */
  encrypted?: boolean

  /**
   * Remote address
   * Client IP address
   */
  remoteAddress?: string
}

/**
 * Internal Router
 *
 * Router with dynamic method access
 */
export interface InternalRouter {
  /**
   * Dynamic HTTP method handlers
   * Example: router['get'](), router['post']()
   */
  [method: string]: any
}

/**
 * Internal Error
 *
 * Error with additional fields (code, validationErrors, statusCode)
 */
export interface InternalError extends Error {
  /**
   * Error code (for application-specific errors)
   */
  code?: string

  /**
   * Validation errors (for validation failures)
   */
  validationErrors?: any

  /**
   * HTTP status code
   */
  statusCode?: number
}

/**
 * Type guard: Check InternalRequest
 *
 * @param req - Request object
 * @returns Whether it is InternalRequest type
 */
export function isInternalRequest(req: any): req is InternalRequest {
  return typeof req === 'object' && req !== null
}

/**
 * Type guard: Check InternalResponse
 *
 * @param res - Response object
 * @returns Whether it is InternalResponse type
 */
export function isInternalResponse(res: any): res is InternalResponse {
  return typeof res === 'object' && res !== null
}

/**
 * Type guard: Check InternalSocket
 *
 * @param socket - Socket object
 * @returns Whether it is InternalSocket type
 */
export function isInternalSocket(socket: any): socket is InternalSocket {
  return typeof socket === 'object' && socket !== null
}

/**
 * Type guard: Check InternalError
 *
 * @param error - Error object
 * @returns Whether it is InternalError type
 */
export function isInternalError(error: Error): error is InternalError {
  return error instanceof Error
}
