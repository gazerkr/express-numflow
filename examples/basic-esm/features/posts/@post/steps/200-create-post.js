/**
 * Create new post in database
 *
 * POST /posts - Step 2
 */

import { createPost } from '#db'

export default async (ctx, req, res) => {
  // Create post
  ctx.post = createPost(ctx.postData)

  console.log('Created new post:', ctx.post.id)
}
