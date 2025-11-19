/**
 * Step 1: Validate user data
 */

module.exports = async (ctx, req, res) => {
  if (!ctx.userData?.name || !ctx.userData?.email) {
    throw new Error('Name and email are required')
  }

  ctx.validated = true
}
