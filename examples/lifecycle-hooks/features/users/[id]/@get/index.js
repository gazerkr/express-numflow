/**
 * Get User Feature
 *
 * Demonstrates:
 * - contextInitializer with authentication
 * - onError with 404 handling
 */

import { feature } from 'express-numflow'
import { authenticateUser } from '#lib/auth'
import { logRequest, logError } from '#lib/logger'

export default feature({
  contextInitializer: (ctx, req, res) => {
    console.log('\n[LIFECYCLE] GET /users/:id - contextInitializer')

    // Authenticate
    try {
      ctx.user = authenticateUser(req)
      console.log(`[LIFECYCLE] User authenticated: ${ctx.user.name}`)
    } catch (error) {
      throw error
    }

    // Log request
    logRequest(ctx, req)

    // Store user ID
    ctx.userId = req.params.id
  },

  onError: async (error, ctx, req, res) => {
    console.log('\n[LIFECYCLE] GET /users/:id - onError')

    logError(error, ctx, req)

    if (error.message.includes('Authorization')) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      })
    } else if (error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: 'Not found',
        message: error.message,
      })
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      })
    }
  },
})
