/**
 * Level 3: Custom Error Class Usage
 */
const { PaymentError } = require('../errors/PaymentError')

module.exports = async (ctx, req, res) => {
  const { cardDeclined, transactionId } = req.body

  if (cardDeclined) {
    throw new PaymentError('Payment failed', {
      transactionId: transactionId || 'tx_test_123',
      reason: 'CARD_DECLINED',
      refundable: false
    })
  }

  ctx.paymentProcessed = true
  ctx.transactionId = transactionId
}
