/**
 * Send response with created post
 *
 * POST /posts - Step 3
 */

module.exports = async (ctx, req, res) => {
  res.status(201).json({
    success: true,
    message: 'Post created successfully',
    post: ctx.post,
  })
}
