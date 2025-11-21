/**
 * Create new post in database
 *
 * POST /posts - Step 2
 */

const db = require('@db')

module.exports = async (ctx, req, res) => {
  // Create post
  ctx.post = db.createPost(ctx.postData)

  console.log('Created new post:', ctx.post.id)
}
