/**
 * Send notification about new post
 *
 * In production, this would send email/push notification to subscribers
 */

export default async (ctx) => {
  // Simulate async email/notification service
  await new Promise(resolve => setTimeout(resolve, 200))

  console.log('[ASYNC-TASK] 📧 Notification sent to subscribers')
  console.log(`[ASYNC-TASK] ℹ️  Post: "${ctx.post.title}" by ${ctx.post.author}`)
}
