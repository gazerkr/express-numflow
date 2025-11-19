/**
 * Type Guards
 *
 * Type Guard functions for runtime type checking
 *
 * @module utils/type-guards
 */

import type {
  InternalRequest,
  InternalResponse,
  InternalSocket,
  InternalError,
} from '../types/internal'

/**
 * Check InternalRequest type
 *
 * @param req - Request object
 * @returns Whether it is InternalRequest type
 *
 * @example
 * ```typescript
 * if (isInternalRequest(req)) {
 *   req.params = { id: '123' } // OK
 * }
 * ```
 */
export function isInternalRequest(req: any): req is InternalRequest {
  return typeof req === 'object' && req !== null
}

/**
 * Check InternalResponse type
 *
 * @param res - Response object
 * @returns Whether it is InternalResponse type
 *
 * @example
 * ```typescript
 * if (isInternalResponse(res)) {
 *   res.req = req // OK
 * }
 * ```
 */
export function isInternalResponse(res: any): res is InternalResponse {
  return typeof res === 'object' && res !== null
}

/**
 * Check InternalSocket type
 *
 * @param socket - Socket object
 * @returns Whether it is InternalSocket type
 *
 * @example
 * ```typescript
 * if (isInternalSocket(socket)) {
 *   const encrypted = socket.encrypted // OK
 * }
 * ```
 */
export function isInternalSocket(socket: any): socket is InternalSocket {
  return typeof socket === 'object' && socket !== null
}

/**
 * Check InternalError type
 *
 * @param error - Error object
 * @returns Whether it is InternalError type
 *
 * @example
 * ```typescript
 * if (isInternalError(error)) {
 *   const code = error.code // OK
 * }
 * ```
 */
export function isInternalError(error: Error): error is InternalError {
  return error instanceof Error
}

/**
 * Check if Request has params field
 *
 * @param req - Request object
 * @returns Whether params field exists
 */
export function hasParams(req: Request): req is Request & { params: Record<string, string> } {
  return 'params' in req && typeof (req as any).params === 'object'
}

/**
 * Check if Request has query field
 *
 * @param req - Request object
 * @returns Whether query field exists
 */
export function hasQuery(req: Request): req is Request & { query: Record<string, any> } {
  return 'query' in req && typeof (req as any).query === 'object'
}

/**
 * Check if Response has req field
 *
 * @param res - Response object
 * @returns Whether req field exists
 */
export function hasReq(res: Response): res is Response & { req: Request } {
  return 'req' in res && typeof (res as any).req === 'object'
}

/**
 * Check if Response has app field
 *
 * @param res - Response object
 * @returns Whether app field exists
 */
export function hasApp(res: Response): res is Response & { app: any } {
  return 'app' in res && typeof (res as any).app === 'object'
}

/**
 * Check if Error has statusCode field
 *
 * @param error - Error object
 * @returns Whether statusCode field exists
 */
export function hasStatusCode(error: Error): error is Error & { statusCode: number } {
  return 'statusCode' in error && typeof (error as any).statusCode === 'number'
}

/**
 * Check if Error has code field
 *
 * @param error - Error object
 * @returns Whether code field exists
 */
export function hasCode(error: Error): error is Error & { code: string } {
  return 'code' in error && typeof (error as any).code === 'string'
}

/**
 * Check if Error has validationErrors field
 *
 * @param error - Error object
 * @returns Whether validationErrors field exists
 */
export function hasValidationErrors(error: Error): error is Error & { validationErrors: any } {
  return (
    'validationErrors' in error &&
    (error as any).validationErrors !== undefined &&
    (error as any).validationErrors !== null
  )
}
