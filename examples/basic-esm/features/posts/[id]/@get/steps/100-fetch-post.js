/**
 * Fetch post by ID
 *
 * GET /posts/:id - Step 1
 */

import { getPostById } from '#db'

export default async (ctx, req, res) => {
  const { id } = req.params

  // Fetch post
  ctx.post = getPostById(id)

  if (!ctx.post) {
    // Post not found - send error and stop
    return res.status(404).json({
      success: false,
      error: 'Post not found',
    })
  }

  // Found, continue to next step
}
