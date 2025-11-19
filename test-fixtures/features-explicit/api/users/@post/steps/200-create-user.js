/**
 * Step 2: Create user
 */

module.exports = async (ctx, req, res) => {
  // Simulate user creation
  ctx.userId = Math.floor(Math.random() * 1000) + 1

  res.statusCode = 201
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({
    success: true,
    userId: ctx.userId,
    name: ctx.userData?.name || 'Test User',
  }))
}
