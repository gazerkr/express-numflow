/**
 * Global Error Handler Example
 *
 * This example demonstrates using app.use() to create a global error handler
 * that catches errors from all routes and features.
 *
 * Key differences from lifecycle hooks (onError):
 * - Global: Handles errors from ALL features in one place
 * - Centralized: Single error handling logic for the entire app
 * - Default fallback: Catches any errors not handled at feature level
 */

import express from 'express'
import { createFeatureRouter } from 'express-numflow'

const app = express()
const PORT = 3000

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Request logging middleware
app.use((req, res, next) => {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`${req.method} ${req.path}`)
  console.log(`${'='.repeat(60)}`)
  next()
})

// Create Feature Router with top-level await
const featureRouter = await createFeatureRouter('./features', {
  debug: false, // Disable debug logging for cleaner output
})

app.use(featureRouter)

// 404 Handler - Must be AFTER featureRouter but BEFORE error handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  })
})

// ============================================================================
// GLOBAL ERROR HANDLER
// ============================================================================
/**
 * This middleware catches ALL errors thrown in any route/feature
 * Must be defined AFTER all routes (app.use(featureRouter)) and 404 handler
 * Must have exactly 4 parameters: (err, req, res, next)
 */
app.use((err, req, res, next) => {
  console.log('\n' + '='.repeat(60))
  console.log('GLOBAL ERROR HANDLER TRIGGERED')
  console.log('='.repeat(60))
  console.log(`Error: ${err.message}`)
  console.log(`Status: ${err.statusCode || 500}`)
  console.log('='.repeat(60) + '\n')

  // Prevent response if already sent
  if (res.headersSent) {
    return next(err)
  }

  // Simple error response - statusCode from error or default 500
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message,
    ...(err.errors && { errors: err.errors }),
  })
})

// Start server
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60))
  console.log('Express-Numflow - Global Error Handler Example')
  console.log('='.repeat(60))
  console.log(`\nServer running on http://localhost:${PORT}`)
  console.log('\nAvailable endpoints:')
  console.log('  GET    /users          - List all users')
  console.log('  POST   /users          - Create a user')
  console.log('  GET    /posts          - List all posts')
  console.log('  GET    /posts/:id      - Get a specific post')
  console.log('\nAll errors are handled by the global error handler')
  console.log('Try invalid requests to see error handling in action!')
  console.log('\n' + '='.repeat(60) + '\n')
})
