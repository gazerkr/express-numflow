/**
 * List all posts
 */

import { getAllPosts } from '#db'

export default async (ctx, req, res) => {
  console.log('[STEP 100] Fetching all posts')

  const posts = getAllPosts()

  console.log(`[STEP 100] Found ${posts.length} posts`)

  res.json({
    success: true,
    count: posts.length,
    posts,
  })
}
