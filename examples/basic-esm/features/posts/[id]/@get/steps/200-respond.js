/**
 * Send response with post
 *
 * GET /posts/:id - Step 2
 */

export default async (ctx, req, res) => {
  res.json({
    success: true,
    post: ctx.post,
  })
}
