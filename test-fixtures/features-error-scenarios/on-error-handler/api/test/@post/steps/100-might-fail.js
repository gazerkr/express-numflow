/**
 * Step that might fail
 */
const { BusinessError } = require('../../../../../../../src/index')

module.exports = async (ctx, req, res) => {
  const { shouldFail, errorType } = req.body

  if (shouldFail) {
    if (errorType === 'business') {
      throw new BusinessError('Business logic failed', 'BUSINESS_ERROR')
    }
    throw new Error('Step execution failed')
  }

  ctx.stepExecuted = true
}
