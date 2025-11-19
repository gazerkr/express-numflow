/**
 * HTTP Error Classes Tests
 *
 * Tests for all HTTP error classes and error utility functions
 */

import {
  HttpError,
  ValidationError,
  BusinessError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  PayloadTooLargeError,
  TooManyRequestsError,
  InternalServerError,
  NotImplementedError,
  ServiceUnavailableError,
  FeatureExecutionError,
  isHttpError,
  isOperationalError,
} from '../../src/errors'

describe('HTTP Error Classes', () => {
  describe('HttpError (base class)', () => {
    it('should create error with message and status code', () => {
      // When: Create HttpError
      const error = new HttpError('Test error', 400)

      // Then: Properties set correctly
      expect(error.message).toBe('Test error')
      expect(error.statusCode).toBe(400)
      expect(error.isOperational).toBe(true)
      expect(error.name).toBe('HttpError')
    })

    it('should create error with suggestion', () => {
      // When: Create HttpError with suggestion
      const error = new HttpError('Test error', 400, {
        suggestion: 'Try this instead',
      })

      // Then: Suggestion is set
      expect(error.suggestion).toBe('Try this instead')
    })

    it('should create error with docUrl', () => {
      // When: Create HttpError with docUrl
      const error = new HttpError('Test error', 400, {
        docUrl: 'https://docs.example.com',
      })

      // Then: docUrl is set
      expect(error.docUrl).toBe('https://docs.example.com')
    })

    it('should have stack trace', () => {
      // When: Create HttpError
      const error = new HttpError('Test error', 400)

      // Then: Stack trace exists
      expect(error.stack).toBeDefined()
      expect(error.stack).toContain('HttpError')
    })

    it('should be instance of Error', () => {
      // When: Create HttpError
      const error = new HttpError('Test error', 400)

      // Then: Is instance of Error
      expect(error instanceof Error).toBe(true)
      expect(error instanceof HttpError).toBe(true)
    })
  })

  describe('ValidationError (400)', () => {
    it('should create validation error with default message', () => {
      // When: Create ValidationError without message
      const error = new ValidationError()

      // Then: Has default message
      expect(error.message).toBe('Validation failed')
      expect(error.statusCode).toBe(400)
      expect(error.name).toBe('ValidationError')
    })

    it('should create validation error with custom message', () => {
      // When: Create ValidationError with custom message
      const error = new ValidationError('Invalid input')

      // Then: Has custom message
      expect(error.message).toBe('Invalid input')
    })

    it('should include validation errors object', () => {
      // Given: Validation errors
      const validationErrors = {
        email: ['Email is required', 'Email must be valid'],
        password: ['Password must be at least 8 characters'],
      }

      // When: Create ValidationError with validation errors
      const error = new ValidationError('Validation failed', validationErrors)

      // Then: Validation errors are set
      expect(error.validationErrors).toEqual(validationErrors)
    })

    it('should have suggestion', () => {
      // When: Create ValidationError
      const error = new ValidationError()

      // Then: Has suggestion
      expect(error.suggestion).toBeDefined()
      expect(error.suggestion).toContain('required fields')
    })

    it('should have docUrl', () => {
      // When: Create ValidationError
      const error = new ValidationError()

      // Then: Has docUrl
      expect(error.docUrl).toBeDefined()
      expect(error.docUrl).toContain('validation-error')
    })
  })

  describe('BusinessError (400)', () => {
    it('should create business error', () => {
      // When: Create BusinessError
      const error = new BusinessError('Insufficient balance')

      // Then: Properties set correctly
      expect(error.message).toBe('Insufficient balance')
      expect(error.statusCode).toBe(400)
      expect(error.name).toBe('BusinessError')
    })

    it('should include error code', () => {
      // When: Create BusinessError with code
      const error = new BusinessError('Insufficient balance', 'INSUFFICIENT_BALANCE')

      // Then: Code is set
      expect(error.code).toBe('INSUFFICIENT_BALANCE')
    })

    it('should work without error code', () => {
      // When: Create BusinessError without code
      const error = new BusinessError('Insufficient balance')

      // Then: Code is undefined
      expect(error.code).toBeUndefined()
    })
  })

  describe('UnauthorizedError (401)', () => {
    it('should create unauthorized error with default message', () => {
      // When: Create UnauthorizedError without message
      const error = new UnauthorizedError()

      // Then: Has default message
      expect(error.message).toBe('Unauthorized')
      expect(error.statusCode).toBe(401)
      expect(error.name).toBe('UnauthorizedError')
    })

    it('should create unauthorized error with custom message', () => {
      // When: Create UnauthorizedError with custom message
      const error = new UnauthorizedError('Invalid token')

      // Then: Has custom message
      expect(error.message).toBe('Invalid token')
    })

    it('should have suggestion about authentication', () => {
      // When: Create UnauthorizedError
      const error = new UnauthorizedError()

      // Then: Has authentication suggestion
      expect(error.suggestion).toBeDefined()
      expect(error.suggestion).toContain('authentication')
    })
  })

  describe('ForbiddenError (403)', () => {
    it('should create forbidden error with default message', () => {
      // When: Create ForbiddenError without message
      const error = new ForbiddenError()

      // Then: Has default message
      expect(error.message).toBe('Forbidden')
      expect(error.statusCode).toBe(403)
      expect(error.name).toBe('ForbiddenError')
    })

    it('should create forbidden error with custom message', () => {
      // When: Create ForbiddenError with custom message
      const error = new ForbiddenError('Admin access required')

      // Then: Has custom message
      expect(error.message).toBe('Admin access required')
    })

    it('should have suggestion about permissions', () => {
      // When: Create ForbiddenError
      const error = new ForbiddenError()

      // Then: Has permissions suggestion
      expect(error.suggestion).toBeDefined()
      expect(error.suggestion).toContain('permissions')
    })
  })

  describe('NotFoundError (404)', () => {
    it('should create not found error with default message', () => {
      // When: Create NotFoundError without message
      const error = new NotFoundError()

      // Then: Has default message
      expect(error.message).toBe('Not found')
      expect(error.statusCode).toBe(404)
      expect(error.name).toBe('NotFoundError')
    })

    it('should create not found error with custom message', () => {
      // When: Create NotFoundError with custom message
      const error = new NotFoundError('User not found')

      // Then: Has custom message
      expect(error.message).toBe('User not found')
    })
  })

  describe('ConflictError (409)', () => {
    it('should create conflict error with default message', () => {
      // When: Create ConflictError without message
      const error = new ConflictError()

      // Then: Has default message
      expect(error.message).toBe('Conflict')
      expect(error.statusCode).toBe(409)
      expect(error.name).toBe('ConflictError')
    })

    it('should create conflict error with custom message', () => {
      // When: Create ConflictError with custom message
      const error = new ConflictError('Email already exists')

      // Then: Has custom message
      expect(error.message).toBe('Email already exists')
    })
  })

  describe('PayloadTooLargeError (413)', () => {
    it('should create payload too large error with default message', () => {
      // When: Create PayloadTooLargeError without message
      const error = new PayloadTooLargeError()

      // Then: Has default message
      expect(error.message).toBe('Payload too large')
      expect(error.statusCode).toBe(413)
      expect(error.name).toBe('PayloadTooLargeError')
    })

    it('should create payload too large error with custom message', () => {
      // When: Create PayloadTooLargeError with custom message
      const error = new PayloadTooLargeError('File too large (max 10MB)')

      // Then: Has custom message
      expect(error.message).toBe('File too large (max 10MB)')
    })
  })

  describe('TooManyRequestsError (429)', () => {
    it('should create too many requests error with default message', () => {
      // When: Create TooManyRequestsError without message
      const error = new TooManyRequestsError()

      // Then: Has default message
      expect(error.message).toBe('Too many requests')
      expect(error.statusCode).toBe(429)
      expect(error.name).toBe('TooManyRequestsError')
    })

    it('should create too many requests error with custom message', () => {
      // When: Create TooManyRequestsError with custom message
      const error = new TooManyRequestsError('Rate limit exceeded')

      // Then: Has custom message
      expect(error.message).toBe('Rate limit exceeded')
    })

    it('should include retryAfter value', () => {
      // When: Create TooManyRequestsError with retryAfter
      const error = new TooManyRequestsError('Rate limit exceeded', 60)

      // Then: retryAfter is set
      expect(error.retryAfter).toBe(60)
    })

    it('should work without retryAfter', () => {
      // When: Create TooManyRequestsError without retryAfter
      const error = new TooManyRequestsError()

      // Then: retryAfter is undefined
      expect(error.retryAfter).toBeUndefined()
    })

    it('should have suggestion with retryAfter in message', () => {
      // When: Create TooManyRequestsError with retryAfter
      const error = new TooManyRequestsError('Rate limit exceeded', 60)

      // Then: Suggestion includes retryAfter
      expect(error.suggestion).toContain('60 seconds')
    })
  })

  describe('InternalServerError (500)', () => {
    it('should create internal server error with default message', () => {
      // When: Create InternalServerError without message
      const error = new InternalServerError()

      // Then: Has default message
      expect(error.message).toBe('Internal server error')
      expect(error.statusCode).toBe(500)
      expect(error.name).toBe('InternalServerError')
    })

    it('should create internal server error with custom message', () => {
      // When: Create InternalServerError with custom message
      const error = new InternalServerError('Database connection failed')

      // Then: Has custom message
      expect(error.message).toBe('Database connection failed')
    })
  })

  describe('NotImplementedError (501)', () => {
    it('should create not implemented error with default message', () => {
      // When: Create NotImplementedError without message
      const error = new NotImplementedError()

      // Then: Has default message
      expect(error.message).toBe('Not implemented')
      expect(error.statusCode).toBe(501)
      expect(error.name).toBe('NotImplementedError')
    })

    it('should create not implemented error with custom message', () => {
      // When: Create NotImplementedError with custom message
      const error = new NotImplementedError('Feature not available yet')

      // Then: Has custom message
      expect(error.message).toBe('Feature not available yet')
    })
  })

  describe('ServiceUnavailableError (503)', () => {
    it('should create service unavailable error with default message', () => {
      // When: Create ServiceUnavailableError without message
      const error = new ServiceUnavailableError()

      // Then: Has default message
      expect(error.message).toBe('Service unavailable')
      expect(error.statusCode).toBe(503)
      expect(error.name).toBe('ServiceUnavailableError')
    })

    it('should create service unavailable error with custom message', () => {
      // When: Create ServiceUnavailableError with custom message
      const error = new ServiceUnavailableError('Maintenance in progress')

      // Then: Has custom message
      expect(error.message).toBe('Maintenance in progress')
    })
  })

  describe('FeatureExecutionError', () => {
    it('should wrap original error', () => {
      // Given: Original error
      const originalError = new Error('Database query failed')

      // When: Create FeatureExecutionError
      const error = new FeatureExecutionError(originalError)

      // Then: Wraps original error
      expect(error.originalError).toBe(originalError)
      expect(error.message).toBe('Database query failed')
      expect(error.statusCode).toBe(500)
      expect(error.name).toBe('FeatureExecutionError')
    })

    it('should include step information', () => {
      // Given: Original error and step info
      const originalError = new Error('Validation failed')
      const step = { number: 100, name: 'validate-input' }

      // When: Create FeatureExecutionError with step
      const error = new FeatureExecutionError(originalError, step)

      // Then: Step information is included
      expect(error.step).toEqual(step)
      expect(error.suggestion).toContain('step 100')
      expect(error.suggestion).toContain('validate-input')
    })

    it('should preserve status code from HttpError', () => {
      // Given: Original HttpError
      const originalError = new ValidationError('Invalid email')

      // When: Create FeatureExecutionError
      const error = new FeatureExecutionError(originalError)

      // Then: Status code is preserved
      expect(error.statusCode).toBe(400)
    })

    it('should use 500 for non-HttpError', () => {
      // Given: Original generic error
      const originalError = new Error('Something went wrong')

      // When: Create FeatureExecutionError
      const error = new FeatureExecutionError(originalError)

      // Then: Status code is 500
      expect(error.statusCode).toBe(500)
    })

    it('should work without step information', () => {
      // Given: Original error without step
      const originalError = new Error('Error occurred')

      // When: Create FeatureExecutionError without step
      const error = new FeatureExecutionError(originalError)

      // Then: step is undefined
      expect(error.step).toBeUndefined()
      expect(error.suggestion).toContain('feature execution')
    })
  })

  describe('isHttpError() utility', () => {
    it('should return true for HttpError', () => {
      // Given: HttpError
      const error = new HttpError('Test', 400)

      // When: Check if HttpError
      const result = isHttpError(error)

      // Then: Returns true
      expect(result).toBe(true)
    })

    it('should return true for ValidationError', () => {
      // Given: ValidationError
      const error = new ValidationError()

      // When: Check if HttpError
      const result = isHttpError(error)

      // Then: Returns true
      expect(result).toBe(true)
    })

    it('should return true for all HTTP error subclasses', () => {
      // Given: All HTTP error types
      const errors = [
        new ValidationError(),
        new BusinessError('Test'),
        new UnauthorizedError(),
        new ForbiddenError(),
        new NotFoundError(),
        new ConflictError(),
        new PayloadTooLargeError(),
        new TooManyRequestsError(),
        new InternalServerError(),
        new NotImplementedError(),
        new ServiceUnavailableError(),
      ]

      // When & Then: All return true
      errors.forEach((error) => {
        expect(isHttpError(error)).toBe(true)
      })
    })

    it('should return false for generic Error', () => {
      // Given: Generic Error
      const error = new Error('Generic error')

      // When: Check if HttpError
      const result = isHttpError(error)

      // Then: Returns false
      expect(result).toBe(false)
    })

    it('should return false for non-error values', () => {
      // When & Then: Returns false for various non-error values
      expect(isHttpError(null)).toBe(false)
      expect(isHttpError(undefined)).toBe(false)
      expect(isHttpError({})).toBe(false)
      expect(isHttpError('error')).toBe(false)
      expect(isHttpError(123)).toBe(false)
    })
  })

  describe('isOperationalError() utility', () => {
    it('should return true for HttpError', () => {
      // Given: HttpError
      const error = new HttpError('Test', 400)

      // When: Check if operational error
      const result = isOperationalError(error)

      // Then: Returns true
      expect(result).toBe(true)
    })

    it('should return true for all HTTP error subclasses', () => {
      // Given: All HTTP error types
      const errors = [
        new ValidationError(),
        new BusinessError('Test'),
        new UnauthorizedError(),
        new ForbiddenError(),
        new NotFoundError(),
        new ConflictError(),
        new PayloadTooLargeError(),
        new TooManyRequestsError(),
        new InternalServerError(),
        new NotImplementedError(),
        new ServiceUnavailableError(),
      ]

      // When & Then: All return true
      errors.forEach((error) => {
        expect(isOperationalError(error)).toBe(true)
      })
    })

    it('should return false for generic Error', () => {
      // Given: Generic Error
      const error = new Error('Generic error')

      // When: Check if operational error
      const result = isOperationalError(error)

      // Then: Returns false
      expect(result).toBe(false)
    })

    it('should return false for non-error values', () => {
      // When & Then: Returns false for various non-error values
      expect(isOperationalError(null)).toBe(false)
      expect(isOperationalError(undefined)).toBe(false)
      expect(isOperationalError({})).toBe(false)
      expect(isOperationalError('error')).toBe(false)
    })
  })
})
