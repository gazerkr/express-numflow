/**
 * Step that fails based on conditions
 */

// Track execution count for testing
let executionCount = 0
const getExecutionCount = () => executionCount
const resetExecutionCount = () => { executionCount = 0 }

module.exports = async (ctx, req, res) => {
  executionCount++

  const { failUntilAttempt, alwaysFail } = req.body

  // Fail until certain attempt count
  if (failUntilAttempt && executionCount < failUntilAttempt) {
    throw new Error(`Attempt ${executionCount} failed (will succeed on attempt ${failUntilAttempt})`)
  }

  // Always fail (for testing max retries)
  if (alwaysFail) {
    throw new Error('Simulated failure')
  }

  ctx.executionCount = executionCount
  ctx.succeeded = true
}

// Export helpers for testing
module.exports.getExecutionCount = getExecutionCount
module.exports.resetExecutionCount = resetExecutionCount
