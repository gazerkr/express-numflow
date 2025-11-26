/**
 * Response Step
 */
module.exports = async (ctx, req, res) => {
  res.status(200).json({
    success: true,
    transactionId: ctx.transaction?.id,
    stepExecuted: ctx.stepExecuted
  })
}
