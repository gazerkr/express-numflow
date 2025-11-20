/**
 * Async Response Proxy
 *
 * Wraps Express response object to track async response methods like:
 * - res.render()
 * - res.download()
 * - res.sendFile()
 *
 * This allows express-numflow to wait for these async methods to complete
 * before checking if response was sent.
 */

import { ServerResponse } from 'http'

/**
 * Tracker for async response operations
 */
export interface AsyncResponseTracker {
  pending: boolean
  promise: Promise<void> | null
}

/**
 * List of async response methods to track
 *
 * Note: 'sendfile' (lowercase) is deprecated in Express 4.x but included for legacy support
 */
const ASYNC_RESPONSE_METHODS = ['render', 'download', 'sendFile', 'sendfile'] as const

/**
 * Create a Proxy wrapper for Express response object
 *
 * Intercepts async response methods and tracks their completion
 *
 * @param res - Express response object
 * @param tracker - Tracker object to store async operation state
 * @returns Proxied response object
 */
export function createAsyncResponseProxy(
  res: ServerResponse,
  tracker: AsyncResponseTracker
): ServerResponse {
  return new Proxy(res, {
    get(target: any, prop: string | symbol) {
      const value = target[prop]

      // Only intercept async response methods
      if (typeof prop === 'string' && ASYNC_RESPONSE_METHODS.includes(prop as any)) {
        // Make sure it's a function
        if (typeof value === 'function') {
          return function (this: any, ...args: any[]) {
            // Use target as this to maintain correct binding
            const boundOriginal = value.bind(target)

            // Mark as pending
            tracker.pending = true

            // Create promise to track completion
            tracker.promise = new Promise<void>((resolve, reject) => {
              // Intercept callback
              const lastArg = args[args.length - 1]
              const hasCallback = typeof lastArg === 'function'

              const wrappedCallback = function (this: any, err?: Error) {
                // Mark as completed
                tracker.pending = false

                // Call original callback if exists
                if (hasCallback) {
                  lastArg.apply(this, arguments)
                }

                // Resolve or reject based on error
                if (err) {
                  reject(err)
                } else {
                  resolve()
                }
              }

              // Replace or add callback
              if (hasCallback) {
                args[args.length - 1] = wrappedCallback
              } else {
                args.push(wrappedCallback)
              }

              // Call original method with target as this
              try {
                boundOriginal(...args)
              } catch (error) {
                // Synchronous error
                tracker.pending = false
                reject(error)
              }
            })

            // Note: res.render() etc. don't return values, so we don't return anything
          }
        }
      }

      // For function properties, bind to target
      if (typeof value === 'function') {
        return value.bind(target)
      }

      // Return other properties as-is
      return value
    },
  })
}
