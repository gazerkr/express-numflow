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
  // Store proxy reference for method chaining support
  let proxy: any

  proxy = new Proxy(res, {
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

              const wrappedCallback = function (this: any, err?: Error, html?: string) {
                // Mark as completed
                tracker.pending = false

                // Call original callback if exists
                if (hasCallback) {
                  lastArg.apply(this, arguments)
                }

                // If no user callback and res.render/res.download/res.sendFile succeeded,
                // we need to send the response
                if (!hasCallback && !err) {
                  // For res.render(), send the rendered HTML
                  if (prop === 'render' && html) {
                    const send = (target as any).send
                    if (typeof send === 'function') {
                      send.call(target, html)
                    }
                  }
                  // For res.download() and res.sendFile(), they handle the response themselves
                  // when no callback is provided, so we don't need to do anything
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

      // For function properties, wrap to support method chaining
      // 🔧 CRITICAL FIX: When methods return 'this' (like res.status()), return proxy instead
      // This ensures chaining works correctly: res.status(400).render(...)
      if (typeof value === 'function') {
        return function (this: any, ...args: any[]) {
          const result = value.apply(target, args)

          // If function returns target (for chaining), return proxy instead
          // This enables: res.status(400).render(...) to work with Proxy
          if (result === target) {
            return proxy
          }

          return result
        }
      }

      // Return other properties as-is
      return value
    },
  })

  return proxy
}
