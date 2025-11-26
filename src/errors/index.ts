/**
 * Error Utilities
 *
 * Simplified Express-style error handling.
 * express-numflow does not provide built-in error classes.
 * Users should use plain Error with statusCode property or their own error classes.
 *
 * @example
 * ```javascript
 * // Express-style error handling
 * const error = new Error('Not found')
 * error.statusCode = 404
 * throw error
 *
 * // In Express error middleware - access original error directly
 * app.use((err, req, res, next) => {
 *   // For FeatureError, access original error via err.originalError
 *   const original = err.originalError || err
 *   const statusCode = original.statusCode || 500
 *   res.status(statusCode).json({ error: original.message })
 * })
 * ```
 */

// This module is now empty but kept for future error utilities if needed
