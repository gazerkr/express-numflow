/**
 * Retry Scenario
 *
 * Features:
 * 1. Immediate retry with retry()
 * 2. Retry with delay
 * 3. Retry with maxAttempts
 * 4. Provider fallback pattern
 */
const { feature, retry } = require('../../../../../../src/index')

// Track retry attempts for testing
let attemptCount = 0
const getAttemptCount = () => attemptCount
const resetAttemptCount = () => { attemptCount = 0 }

module.exports = feature({
  contextInitializer: (ctx, req, res) => {
    ctx.provider = req.body.provider || 'primary'
    ctx.retryCount = 0
    ctx.maxRetries = req.body.maxRetries || 3
  },

  onError: async (error, ctx, req, res) => {
    const { retryMode, failUntilAttempt } = req.body

    ctx.retryCount++
    attemptCount++

    // Provider fallback pattern
    if (retryMode === 'fallback') {
      const providers = ['primary', 'secondary', 'tertiary']
      const currentIndex = providers.indexOf(ctx.provider)

      if (currentIndex < providers.length - 1) {
        ctx.provider = providers[currentIndex + 1]
        return retry({ delay: 10 }) // Short delay for testing
      }
    }

    // Immediate retry
    if (retryMode === 'immediate' && ctx.retryCount < ctx.maxRetries) {
      return retry()
    }

    // Retry with delay
    if (retryMode === 'delayed' && ctx.retryCount < ctx.maxRetries) {
      return retry({ delay: 10 }) // Short delay for testing
    }

    // Retry with maxAttempts
    if (retryMode === 'maxAttempts') {
      return retry({ maxAttempts: ctx.maxRetries })
    }

    // Exponential backoff simulation
    if (retryMode === 'exponential' && ctx.retryCount < ctx.maxRetries) {
      const delay = 10 * Math.pow(2, ctx.retryCount - 1) // 10ms, 20ms, 40ms...
      return retry({ delay })
    }

    // No more retries - send error response
    res.status(503).json({
      success: false,
      error: error.message,
      totalAttempts: ctx.retryCount + 1,
      finalProvider: ctx.provider
    })
  }
})

// Export helpers for testing
module.exports.getAttemptCount = getAttemptCount
module.exports.resetAttemptCount = resetAttemptCount
