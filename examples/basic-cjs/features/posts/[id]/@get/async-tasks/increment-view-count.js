/**
 * Increment post view count
 *
 * In production, this would update view count in database
 * Run in background to avoid blocking the response
 */

module.exports = async (ctx) => {
  // Simulate async database update
  await new Promise(resolve => setTimeout(resolve, 100))

  console.log('[ASYNC-TASK] 👁️  View count incremented')
  console.log(`[ASYNC-TASK] ℹ️  Post: "${ctx.post.title}" (ID: ${ctx.post.id})`)
}
