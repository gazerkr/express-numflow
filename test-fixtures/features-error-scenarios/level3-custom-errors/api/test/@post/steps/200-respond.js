/**
 * Level 3: Response Step
 */
module.exports = async (ctx, req, res) => {
  res.status(200).json({
    success: true,
    paymentProcessed: ctx.paymentProcessed,
    transactionId: ctx.transactionId
  })
}
