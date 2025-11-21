/**
 * Log analytics for posts list view
 *
 * This async task runs in the background after the response is sent.
 * Perfect for non-blocking operations like logging, analytics, etc.
 */

import { Post } from '@db'

interface Context {
  posts: Post[]
}

export default async (ctx: Context) => {
  // Simulate async operation (e.g., sending to analytics service)
  await new Promise(resolve => setTimeout(resolve, 100))

  console.log('[ASYNC-TASK] 📊 Analytics logged: User viewed posts list')
  console.log(`[ASYNC-TASK] ℹ️  Total posts shown: ${ctx.posts.length}`)
}
