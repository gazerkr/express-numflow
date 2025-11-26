/**
 * Level 2: Built-in Error Types
 * Use ValidationError, BusinessError, NotFoundError, etc.
 */
const {
  ValidationError,
  BusinessError,
  NotFoundError,
  UnauthorizedError,
  ConflictError,
  TooManyRequestsError
} = require('../../../../../../../src/index')

module.exports = async (ctx, req, res) => {
  const { errorType, email, password, userId, stockAmount } = req.body

  switch (errorType) {
    case 'validation':
      // ValidationError with field-level errors
      const errors = {}
      if (!email?.includes('@')) {
        errors.email = ['Please enter a valid email']
      }
      if (!password || password.length < 8) {
        errors.password = ['Password must be at least 8 characters']
      }
      if (Object.keys(errors).length > 0) {
        throw new ValidationError('Validation failed', errors)
      }
      break

    case 'business':
      // BusinessError with code
      if (stockAmount < 10) {
        throw new BusinessError('Insufficient stock', 'OUT_OF_STOCK')
      }
      break

    case 'notfound':
      // NotFoundError
      if (!userId) {
        throw new NotFoundError('User not found')
      }
      break

    case 'unauthorized':
      // UnauthorizedError
      throw new UnauthorizedError('Invalid token')

    case 'conflict':
      // ConflictError
      throw new ConflictError('Email already in use')

    case 'ratelimit':
      // TooManyRequestsError with retryAfter
      throw new TooManyRequestsError('Rate limit exceeded', 60)
  }

  ctx.validated = true
}
