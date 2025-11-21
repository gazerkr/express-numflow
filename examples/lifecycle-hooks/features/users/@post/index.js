/**
 * Create User Feature
 *
 * Demonstrates:
 * - contextInitializer: Initialize request context with auth, logging
 * - onError: Handle validation errors and other errors
 */

import { feature } from 'express-numflow'
import { authenticateUser } from '#lib/auth'
import { logRequest, logError } from '#lib/logger'

export default feature({
  /**
   * Context Initializer
   *
   * Runs BEFORE all steps
   * Perfect for:
   * - Authentication
   * - Logging
   * - Setting up shared data
   * - Request validation
   */
  contextInitializer: (ctx, req, res) => {
    // 1. Log request
    console.log('\n[LIFECYCLE] contextInitializer - START')

    // 2. Authenticate user
    try {
      ctx.user = authenticateUser(req)
      console.log(`[LIFECYCLE] Authenticated user: ${ctx.user.name}`)
    } catch (error) {
      console.log(`[LIFECYCLE] Authentication failed: ${error.message}`)
      throw error // Will be caught by onError
    }

    // 3. Log request details
    logRequest(ctx, req)

    // 4. Store request body
    ctx.userData = req.body

    // 5. Add request timestamp
    ctx.requestTime = new Date()

    console.log('[LIFECYCLE] contextInitializer - END\n')
  },

  /**
   * Error Handler
   *
   * Runs when ANY error occurs in:
   * - contextInitializer
   * - steps
   * - async tasks
   *
   * Perfect for:
   * - Logging errors
   * - Sending appropriate error responses
   * - Error categorization
   */
  onError: async (error, ctx, req, res) => {
    console.log('\n[LIFECYCLE] onError - START')
    console.log(`[LIFECYCLE] Error: ${error.message}`)

    // Log error
    logError(error, ctx, req)

    // Handle different error types
    if (error.message.includes('Authorization')) {
      // Authentication error
      console.log('[LIFECYCLE] Handling auth error')
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: error.message,
      })
    } else if (error.message.includes('validation') || error.errors) {
      // Validation error
      console.log('[LIFECYCLE] Handling validation error')
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors: error.errors || [error.message],
      })
    } else if (error.message.includes('already exists')) {
      // Conflict error
      console.log('[LIFECYCLE] Handling conflict error')
      res.status(409).json({
        success: false,
        error: 'Conflict',
        message: error.message,
      })
    } else {
      // General server error
      console.log('[LIFECYCLE] Handling server error')
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred',
      })
    }

    console.log('[LIFECYCLE] onError - END\n')
  },
})
