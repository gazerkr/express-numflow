/**
 * Duck Typing Tests for Error Utilities
 *
 * These tests verify that error utility functions work correctly
 * with duck-typed errors (errors from different module instances).
 *
 * Problem: When using `file:../` references, instanceof checks fail
 * because each module instance has its own class definition.
 *
 * Solution: Use duck typing with hasStatusCode() as a fallback.
 */

import {
  HttpError,
  ValidationError,
  NotFoundError,
  FeatureExecutionError,
  isHttpError,
  isOperationalError,
} from '../../src/errors'

describe('Duck Typing for Error Utilities', () => {
  describe('isHttpError() with duck-typed errors', () => {
    it('should detect duck-typed HTTP error (different module instance simulation)', () => {
      // Given: Simulated error from different module instance (has same structure but different prototype)
      const duckTypedError = Object.create(Error.prototype, {
        name: { value: 'NotFoundError', writable: true },
        message: { value: 'User not found', writable: true },
        statusCode: { value: 404, writable: true },
        isOperational: { value: true, writable: true },
      })
      duckTypedError.stack = new Error().stack

      // When: Check if it's an HttpError
      const result = isHttpError(duckTypedError)

      // Then: Should return true (duck typing)
      expect(result).toBe(true)
    })

    it('should detect duck-typed ValidationError', () => {
      // Given: Simulated ValidationError from different module instance
      const duckTypedError = Object.create(Error.prototype, {
        name: { value: 'ValidationError', writable: true },
        message: { value: 'Invalid email', writable: true },
        statusCode: { value: 400, writable: true },
        isOperational: { value: true, writable: true },
        validationErrors: {
          value: { email: ['Invalid format'] },
          writable: true,
        },
      })

      // When: Check if it's an HttpError
      const result = isHttpError(duckTypedError)

      // Then: Should return true (duck typing)
      expect(result).toBe(true)
    })

    it('should detect duck-typed BusinessError with code', () => {
      // Given: Simulated BusinessError from different module instance
      const duckTypedError = Object.create(Error.prototype, {
        name: { value: 'BusinessError', writable: true },
        message: { value: 'Insufficient balance', writable: true },
        statusCode: { value: 400, writable: true },
        isOperational: { value: true, writable: true },
        code: { value: 'INSUFFICIENT_BALANCE', writable: true },
      })

      // When: Check if it's an HttpError
      const result = isHttpError(duckTypedError)

      // Then: Should return true (duck typing)
      expect(result).toBe(true)
    })

    it('should still work with real HttpError instances', () => {
      // Given: Real HttpError from same module
      const realError = new HttpError('Test error', 400)

      // When: Check if it's an HttpError
      const result = isHttpError(realError)

      // Then: Should return true
      expect(result).toBe(true)
    })

    it('should return false for regular Error without statusCode', () => {
      // Given: Regular Error (no statusCode)
      const regularError = new Error('Regular error')

      // When: Check if it's an HttpError
      const result = isHttpError(regularError)

      // Then: Should return false
      expect(result).toBe(false)
    })

    it('should return false for object with statusCode but not an Error', () => {
      // Given: Plain object with statusCode (not an Error)
      const fakeError = {
        message: 'Fake error',
        statusCode: 400,
        isOperational: true,
      }

      // When: Check if it's an HttpError
      const result = isHttpError(fakeError)

      // Then: Should return false (must be Error instance)
      expect(result).toBe(false)
    })
  })

  describe('isOperationalError() with duck-typed errors', () => {
    it('should detect duck-typed operational error', () => {
      // Given: Simulated operational error from different module instance
      const duckTypedError = Object.create(Error.prototype, {
        name: { value: 'HttpError', writable: true },
        message: { value: 'Bad request', writable: true },
        statusCode: { value: 400, writable: true },
        isOperational: { value: true, writable: true },
      })

      // When: Check if it's an operational error
      const result = isOperationalError(duckTypedError)

      // Then: Should return true
      expect(result).toBe(true)
    })

    it('should return false for duck-typed non-operational error', () => {
      // Given: Simulated error with isOperational = false
      const duckTypedError = Object.create(Error.prototype, {
        name: { value: 'HttpError', writable: true },
        message: { value: 'System error', writable: true },
        statusCode: { value: 500, writable: true },
        isOperational: { value: false, writable: true },
      })

      // When: Check if it's an operational error
      const result = isOperationalError(duckTypedError)

      // Then: Should return false (isOperational is false)
      expect(result).toBe(false)
    })

    it('should still work with real HttpError instances', () => {
      // Given: Real HttpError from same module
      const realError = new ValidationError('Validation failed')

      // When: Check if it's an operational error
      const result = isOperationalError(realError)

      // Then: Should return true
      expect(result).toBe(true)
    })

    it('should return false for regular Error', () => {
      // Given: Regular Error
      const regularError = new Error('Regular error')

      // When: Check if it's an operational error
      const result = isOperationalError(regularError)

      // Then: Should return false
      expect(result).toBe(false)
    })
  })

  describe('FeatureExecutionError with duck-typed original errors', () => {
    it('should preserve statusCode from duck-typed HttpError', () => {
      // Given: Simulated HttpError from different module instance
      const duckTypedError = Object.create(Error.prototype, {
        name: { value: 'NotFoundError', writable: true },
        message: { value: 'User not found', writable: true },
        statusCode: { value: 404, writable: true },
        isOperational: { value: true, writable: true },
      })

      // When: Create FeatureExecutionError wrapping duck-typed error
      const featureError = new FeatureExecutionError(duckTypedError)

      // Then: Should preserve the statusCode from duck-typed error
      expect(featureError.statusCode).toBe(404)
    })

    it('should preserve statusCode from duck-typed ValidationError', () => {
      // Given: Simulated ValidationError from different module instance
      const duckTypedError = Object.create(Error.prototype, {
        name: { value: 'ValidationError', writable: true },
        message: { value: 'Invalid input', writable: true },
        statusCode: { value: 400, writable: true },
        isOperational: { value: true, writable: true },
        validationErrors: {
          value: { email: ['Required'] },
          writable: true,
        },
      })

      // When: Create FeatureExecutionError wrapping duck-typed error
      const featureError = new FeatureExecutionError(duckTypedError)

      // Then: Should preserve the statusCode (400)
      expect(featureError.statusCode).toBe(400)
    })

    it('should use 500 for errors without statusCode', () => {
      // Given: Regular Error without statusCode
      const regularError = new Error('Database error')

      // When: Create FeatureExecutionError
      const featureError = new FeatureExecutionError(regularError)

      // Then: Should use 500 as default
      expect(featureError.statusCode).toBe(500)
    })

    it('should still work with real HttpError instances', () => {
      // Given: Real HttpError from same module
      const realError = new NotFoundError('Resource not found')

      // When: Create FeatureExecutionError
      const featureError = new FeatureExecutionError(realError)

      // Then: Should preserve the statusCode
      expect(featureError.statusCode).toBe(404)
    })
  })
})
