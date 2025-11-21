/**
 * Send post response
 */

export default async (ctx, req, res) => {
  console.log('[STEP 200] Sending response')

  res.json({
    success: true,
    post: ctx.post,
  })
}
