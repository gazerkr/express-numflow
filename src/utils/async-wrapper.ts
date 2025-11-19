/**
 * AsyncWrapper
 *
 * Unified error handling
 * Automatically wraps async handlers to catch Promise rejections
 */

import { Request, Response, NextFunction, RequestHandler } from '../types/index'

/**
 * Wrap async handler to automatically catch errors
 *
 * @param fn - Async handler function
 * @returns Wrapped handler
 *
 * @example
 * ```typescript
 * app.get('/users/:id', asyncWrapper(async (req, res) => {
 *   const user = await db.findUser(req.params.id) // Error can occur
 *   res.json(user)
 * }))
 * ```
 *
 * @example
 * ```typescript
 * // No try-catch needed!
 * app.get('/users/:id', async (req, res) => {
 *   const user = await db.findUser(req.params.id)
 *   res.json(user)
 * })
 * ```
 */
export function asyncWrapper(fn: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    // Catch synchronous errors
    try {
      const result = fn(req, res, next)

      // Catch rejection if Promise
      if (result && typeof result.then === 'function') {
        result.catch(next)
      }
    } catch (error) {
      // Pass synchronous errors
      next(error)
    }
  }
}

/**
 * Check if handler is an async function
 */
export function isAsyncFunction(fn: Function): boolean {
  return fn.constructor.name === 'AsyncFunction'
}

/**
 * Check if handler returns a Promise
 */
export function returnsPromise(fn: Function, ...args: any[]): boolean {
  try {
    const result = fn(...args)
    return result && typeof result.then === 'function'
  } catch {
    return false
  }
}
