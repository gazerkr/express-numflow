/**
 * Fetch all posts from database
 *
 * GET /posts - Step 1
 *
 * Demonstrates short path: import from '#db'
 */

import { getAllPosts } from '#db'

export default async (ctx, req, res) => {
  // Fetch all posts
  ctx.posts = getAllPosts()
}
