/**
 * Create Post Feature
 *
 * Demonstrates:
 * - contextInitializer with role-based access control
 * - onError with permission errors
 */

import { feature } from 'express-numflow'
import { authenticateUser, requireRole } from '#lib/auth'
import { logRequest, logError } from '#lib/logger'

export default feature({
  contextInitializer: (ctx, req, res) => {
    console.log('\n[LIFECYCLE] POST /posts - contextInitializer')

    // 1. Authenticate
    try {
      ctx.user = authenticateUser(req)
      console.log(`[LIFECYCLE] User: ${ctx.user.name} (${ctx.user.role})`)
    } catch (error) {
      throw error
    }

    // 2. Check permissions (admin only can create posts)
    try {
      requireRole(ctx.user, 'admin')
      console.log('[LIFECYCLE] Permission check passed')
    } catch (error) {
      throw error
    }

    // 3. Log request
    logRequest(ctx, req)

    // 4. Store post data
    ctx.postData = req.body
    ctx.postData.authorId = ctx.user.id // Set author from authenticated user
  },

  onError: async (error, ctx, req, res) => {
    console.log('\n[LIFECYCLE] POST /posts - onError')

    logError(error, ctx, req)

    if (error.message.includes('Authorization')) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      })
    } else if (error.message.includes('Admin access required')) {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Only admins can create posts',
      })
    } else if (error.message.includes('validation') || error.errors) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors: error.errors || [error.message],
      })
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      })
    }
  },
})
