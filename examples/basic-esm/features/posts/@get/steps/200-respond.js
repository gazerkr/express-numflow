/**
 * Send response with posts
 *
 * GET /posts - Step 2
 */

export default async (ctx, req, res) => {
  res.json({
    success: true,
    count: ctx.posts.length,
    posts: ctx.posts,
  })
}
