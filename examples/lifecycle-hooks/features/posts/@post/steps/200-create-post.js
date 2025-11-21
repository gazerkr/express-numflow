/**
 * Create post in database
 */

import { createPost } from '#db'

export default async (ctx, req, res) => {
  console.log('[STEP 200] Creating post')

  ctx.post = createPost(ctx.postData)

  console.log(`[STEP 200] Post created: ${ctx.post.id}`)

  res.status(201).json({
    success: true,
    message: 'Post created successfully',
    post: ctx.post,
  })
}
