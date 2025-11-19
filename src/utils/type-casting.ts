/**
 * Type Casting Utilities
 *
 * Utility functions for safe type casting
 * Maintains type safety by replacing `as any` usage
 *
 * @module utils/type-casting
 */

import type {
  InternalRequest,
  InternalResponse,
  InternalSocket,
  InternalRouter,
  InternalError,
} from '../types/internal'

/**
 * Cast Request to InternalRequest
 *
 * @param req - Request object (allows any type)
 * @returns Object casted to InternalRequest type
 *
 * @example
 * ```typescript
 * const internalReq = asInternalRequest(req)
 * internalReq.params = { id: '123' }
 * ```
 */
export function asInternalRequest(req: any): InternalRequest {
  return req as InternalRequest
}

/**
 * Cast Response to InternalResponse
 *
 * @param res - Response object (allows any type)
 * @returns Object casted to InternalResponse type
 *
 * @example
 * ```typescript
 * const internalRes = asInternalResponse(res)
 * internalRes.req = req
 * internalRes.app = app
 * ```
 */
export function asInternalResponse(res: any): InternalResponse {
  return res as InternalResponse
}

/**
 * Cast Socket to InternalSocket
 *
 * @param socket - Socket object (allows any type)
 * @returns Object casted to InternalSocket type
 *
 * @example
 * ```typescript
 * const internalSocket = asInternalSocket(req.socket)
 * const encrypted = internalSocket.encrypted
 * const ip = internalSocket.remoteAddress
 * ```
 */
export function asInternalSocket(socket: any): InternalSocket {
  return socket as InternalSocket
}

/**
 * Cast Router to InternalRouter
 *
 * @param router - Router object (allows any type)
 * @returns Object casted to InternalRouter type
 *
 * @example
 * ```typescript
 * const internalRouter = asInternalRouter(router)
 * internalRouter[method](path, handler) // Dynamic method call
 * ```
 */
export function asInternalRouter(router: any): InternalRouter {
  return router as InternalRouter
}

/**
 * Cast Error to InternalError
 *
 * @param error - Error object (allows any type)
 * @returns Object casted to InternalError type
 *
 * @example
 * ```typescript
 * const internalError = asInternalError(error)
 * const statusCode = internalError.statusCode || 500
 * const code = internalError.code
 * ```
 */
export function asInternalError(error: any): InternalError {
  return error as InternalError
}

/**
 * Cast any type to specific type (generic version)
 *
 * @param value - any type value
 * @returns Value casted to T type
 *
 * @example
 * ```typescript
 * const value = castTo<string>(someAnyValue)
 * ```
 */
export function castTo<T>(value: any): T {
  return value as T
}

/**
 * Add field to object (type-safe)
 *
 * @param target - Target object
 * @param key - Field name to add
 * @param value - Value to add
 *
 * @example
 * ```typescript
 * setField(req, 'params', { id: '123' })
 * setField(res, 'req', req)
 * ```
 */
export function setField<T extends object, K extends string, V>(
  target: T,
  key: K,
  value: V
): asserts target is T & Record<K, V> {
  ;(target as any)[key] = value
}

/**
 * Get field from object (type-safe)
 *
 * @param source - Source object
 * @param key - Field name to get
 * @returns Field value
 *
 * @example
 * ```typescript
 * const params = getField<Record<string, string>>(req, 'params')
 * const app = getField<Application>(res, 'app')
 * ```
 */
export function getField<T>(source: any, key: string): T | undefined {
  return source[key] as T | undefined
}

/**
 * Check if object has field and get it
 *
 * @param source - Source object
 * @param key - Field name to check
 * @returns Field value or undefined
 *
 * @example
 * ```typescript
 * const params = getFieldSafe<Record<string, string>>(req, 'params')
 * if (params) {
 *   console.log(params.id)
 * }
 * ```
 */
export function getFieldSafe<T>(source: any, key: string): T | undefined {
  if (typeof source === 'object' && source !== null && key in source) {
    return source[key] as T
  }
  return undefined
}
