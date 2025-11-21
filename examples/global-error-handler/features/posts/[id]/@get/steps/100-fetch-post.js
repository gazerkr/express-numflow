/**
 * Fetch post by ID
 * Throws an error if post is not found
 */

import { getPostById } from '#db'

export default async (ctx, req, res) => {
  console.log(`[STEP 100] Fetching post with ID: ${req.params.id}`)

  const post = getPostById(req.params.id)

  if (!post) {
    console.log('[STEP 100] ❌ Post not found')
    // Throw error - will be caught by global error handler
    throw new Error(`Post with ID ${req.params.id} not found`)
  }

  ctx.post = post
  console.log(`[STEP 100] ✅ Post found: ${post.title}`)
}
