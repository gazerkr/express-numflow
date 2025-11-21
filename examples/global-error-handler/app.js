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

// ============================================================================
// GLOBAL ERROR HANDLER
// ============================================================================
/**
 * This middleware catches ALL errors thrown in any route/feature
 * Must be defined AFTER all routes (app.use(featureRouter))
 * Must have exactly 4 parameters: (err, req, res, next)
 */
app.use((err, req, res, next) => {
  console.log('\n' + '='.repeat(60))
  console.log('GLOBAL ERROR HANDLER TRIGGERED')
  console.log('='.repeat(60))

  // Log error details
  console.log(`Error Type: ${err.constructor.name}`)
  console.log(`Error Message: ${err.message}`)
  if (err.stack) {
    console.log(`Stack Trace:\n${err.stack}`)
  }

  // Custom error properties
  if (err.statusCode) {
    console.log(`Status Code: ${err.statusCode}`)
  }
  if (err.errors) {
    console.log(`Validation Errors:`, err.errors)
  }

  console.log('='.repeat(60) + '\n')

  // Prevent response if already sent
  if (res.headersSent) {
    console.log('Response already sent, delegating to default handler')
    return next(err)
  }

  // ========================================
  // Error Response Logic
  // ========================================

  // 1. Validation Errors (400)
  if (err.message.includes('validation') || err.errors) {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: err.message,
      errors: err.errors || [],
    })
  }

  // 2. Not Found Errors (404)
  if (err.message.includes('not found')) {
    return res.status(404).json({
      success: false,
      error: 'Not Found',
      message: err.message,
    })
  }

  // 3. Conflict Errors (409)
  if (err.message.includes('already exists') || err.message.includes('duplicate')) {
    return res.status(409).json({
      success: false,
      error: 'Conflict',
      message: err.message,
    })
  }

  // 4. Custom Status Code
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.name || 'Error',
      message: err.message,
    })
  }

  // 5. Generic Server Error (500)
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
  })
})

// 404 Handler - Must be AFTER featureRouter but BEFORE error handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
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
