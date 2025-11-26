/**
 * Response Step
 */
module.exports = async (ctx, req, res) => {
  res.status(200).json({
    success: true,
    executionCount: ctx.executionCount,
    provider: ctx.provider,
    retryCount: ctx.retryCount
  })
}
