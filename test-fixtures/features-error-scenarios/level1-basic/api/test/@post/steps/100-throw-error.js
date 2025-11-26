/**
 * Level 1: Basic Error Handling
 * Simply throw new Error() - auto-handled as 500
 */
module.exports = async (ctx, req, res) => {
  const { shouldFail } = req.body

  if (shouldFail) {
    throw new Error('Something went wrong')
  }

  ctx.success = true
}
