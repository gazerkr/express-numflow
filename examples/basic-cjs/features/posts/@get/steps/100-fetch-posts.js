/**
 * Fetch all posts from database
 *
 * GET /posts - Step 1
 *
 * Demonstrates short path: require('@db')
 */

const db = require('@db')

module.exports = async (ctx, req, res) => {
  // Fetch all posts
  ctx.posts = db.getAllPosts()
}
