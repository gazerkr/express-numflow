/**
 * Level 3: Custom Error Class - PaymentError
 */
const { HttpError } = require('../../../../../../../src/index')

class PaymentError extends HttpError {
  constructor(message, { transactionId, reason, refundable = false }) {
    super(message, 402) // 402 Payment Required
    this.name = 'PaymentError'
    this.transactionId = transactionId
    this.reason = reason
    this.refundable = refundable
  }
}

module.exports = { PaymentError }
