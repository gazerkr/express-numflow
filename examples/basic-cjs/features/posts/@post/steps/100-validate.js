/**
 * Validate post creation data
 *
 * POST /posts - Step 1
 *
 * Demonstrates short path: require('@lib/validators')
 */

const { validatePost } = require('@lib/validators')

module.exports = async (ctx, req, res) => {
  // Store request body in context
  ctx.postData = req.body

  // Validate
  const validation = validatePost(ctx.postData)

  if (!validation.valid) {
    // If validation fails, send error response
    // This will stop execution of subsequent steps
    return res.status(400).json({
      success: false,
      errors: validation.errors,
    })
  }

  // Validation passed, continue to next step
  ctx.validated = true
}
