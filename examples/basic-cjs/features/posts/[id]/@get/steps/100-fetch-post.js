/**
 * Fetch post by ID
 *
 * GET /posts/:id - Step 1
 */

const db = require('@db')

module.exports = async (ctx, req, res) => {
  const { id } = req.params

  // Fetch post
  ctx.post = db.getPostById(id)

  if (!ctx.post) {
    // Post not found - send error and stop
    return res.status(404).json({
      success: false,
      error: 'Post not found',
    })
  }

  // Found, continue to next step
}
