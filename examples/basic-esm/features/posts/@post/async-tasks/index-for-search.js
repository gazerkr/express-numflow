/**
 * Index post for search engine
 *
 * In production, this would index the post in search service (e.g., Elasticsearch, Algolia)
 */

export default async (ctx) => {
  // Simulate async search indexing
  await new Promise(resolve => setTimeout(resolve, 300))

  console.log('[ASYNC-TASK] 🔍 Search index updated')
  console.log(`[ASYNC-TASK] ℹ️  Indexed: "${ctx.post.title}"`)
  console.log(`[ASYNC-TASK] ℹ️  Searchable by: title, content, author`)
}
