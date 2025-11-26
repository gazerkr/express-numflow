/**
 * onError Handler Scenario
 *
 * Features:
 * 1. ctx access for transaction rollback
 * 2. Direct error response
 * 3. Re-throw to delegate to global handler
 */
const { feature } = require('../../../../../../src/index')

// Track rollback calls for testing
let rollbackCalled = false
const getRollbackCalled = () => rollbackCalled
const resetRollbackCalled = () => { rollbackCalled = false }

module.exports = feature({
  contextInitializer: async (ctx, req, res) => {
    // Simulate transaction
    ctx.transaction = {
      id: 'tx_' + Date.now(),
      rollback: async () => {
        rollbackCalled = true
        return true
      }
    }
    ctx.userId = req.body.userId
  },

  onError: async (error, ctx, req, res) => {
    const { delegateToGlobal, handleLocally } = req.body

    // Rollback transaction
    if (ctx.transaction) {
      await ctx.transaction.rollback()
    }

    if (delegateToGlobal) {
      // Delegate to Express global error handler
      throw error
    }

    if (handleLocally) {
      // Handle locally and send response
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message,
        handledBy: 'onError',
        transactionRolledBack: true,
        transactionId: ctx.transaction?.id
      })
      return
    }

    // Default: delegate to global
    throw error
  }
})

// Export helper for testing
module.exports.getRollbackCalled = getRollbackCalled
module.exports.resetRollbackCalled = resetRollbackCalled
