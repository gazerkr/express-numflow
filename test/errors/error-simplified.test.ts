/**
 * Simplified Error Handling Tests
 *
 * Express-style simple error handling:
 * - FeatureError wraps errors with step information
 * - err.originalError provides direct access to the original error
 * - statusCode is preserved if present on original error
 */
import { describe, it, expect } from '@jest/globals'
import { FeatureError, StepInfo } from '../../src/http/types'

describe('Simplified Error Handling', () => {
  describe('FeatureError', () => {
    it('should wrap error with step information', () => {
      const originalError = new Error('Something went wrong')
      const step: StepInfo = { number: 100, name: '100-validate.js', fn: async () => {}, path: '/path' }

      const featureError = new FeatureError(
        originalError.message,
        originalError,
        step,
        {},
        500
      )

      expect(featureError).toBeInstanceOf(Error)
      expect(featureError.name).toBe('FeatureError')
      expect(featureError.message).toBe('Something went wrong')
      expect(featureError.step).toEqual(step)
      expect(featureError.originalError).toBe(originalError)
      expect(featureError.statusCode).toBe(500)
    })

    it('should preserve statusCode from original error', () => {
      const originalError = new Error('Not found') as Error & { statusCode: number }
      originalError.statusCode = 404

      const step: StepInfo = { number: 200, name: '200-fetch.js', fn: async () => {}, path: '/path' }

      const featureError = new FeatureError(
        originalError.message,
        originalError,
        step,
        {},
        originalError.statusCode
      )

      expect(featureError.statusCode).toBe(404)
      expect(featureError.originalError).toBe(originalError)
    })

    it('should default to 500 for errors without statusCode', () => {
      const originalError = new Error('Database connection failed')
      const step: StepInfo = { number: 300, name: '300-db.js', fn: async () => {}, path: '/path' }

      const featureError = new FeatureError(
        originalError.message,
        originalError,
        step
      )

      expect(featureError.statusCode).toBe(500)
    })

    it('should allow access to step info for debugging', () => {
      const originalError = new Error('Validation failed')
      const step: StepInfo = {
        number: 100,
        name: '100-validate-input.js',
        fn: async () => {},
        path: '/features/api/users/@post/steps/100-validate-input.js'
      }

      const featureError = new FeatureError(
        originalError.message,
        originalError,
        step
      )

      // Step info should be easily accessible for debugging
      expect(featureError.step?.number).toBe(100)
      expect(featureError.step?.name).toBe('100-validate-input.js')
      expect(featureError.step?.path).toContain('100-validate-input.js')
    })
  })

  describe('originalError direct access', () => {
    it('should access original error directly via .originalError property', () => {
      const original = new Error('Root cause')
      const wrapped = new FeatureError(original.message, original)

      // Direct access - no function needed!
      expect(wrapped.originalError).toBe(original)
    })

    it('should preserve original error with all its properties', () => {
      const original = new Error('Validation failed') as Error & {
        statusCode: number
        code: string
      }
      original.statusCode = 400
      original.code = 'INVALID_INPUT'

      const wrapped = new FeatureError(original.message, original)

      // Access original error and its custom properties directly
      const unwrapped = wrapped.originalError as typeof original
      expect(unwrapped.message).toBe('Validation failed')
      expect(unwrapped.statusCode).toBe(400)
      expect(unwrapped.code).toBe('INVALID_INPUT')
    })

    it('should return undefined when no original error', () => {
      const error = new FeatureError('Simple error')

      expect(error.originalError).toBeUndefined()
    })
  })

  describe('Express-style error handling', () => {
    it('should work with plain Error and statusCode property', () => {
      // Express-style: add statusCode to plain Error
      const error = new Error('Resource not found') as Error & { statusCode: number }
      error.statusCode = 404

      // In app.use() error handler
      expect(error.statusCode).toBe(404)
      expect(error.message).toBe('Resource not found')
    })

    it('should work with custom error properties', () => {
      // User can add any custom properties
      const error = new Error('Validation failed') as Error & {
        statusCode: number
        code: string
        details: object
      }
      error.statusCode = 400
      error.code = 'VALIDATION_ERROR'
      error.details = { email: 'Invalid email format' }

      // All properties are accessible
      expect(error.statusCode).toBe(400)
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.details).toEqual({ email: 'Invalid email format' })
    })

    it('should preserve custom properties through FeatureError wrapping', () => {
      // Create error with custom properties
      const original = new Error('Business rule violation') as Error & {
        statusCode: number
        code: string
      }
      original.statusCode = 400
      original.code = 'INSUFFICIENT_BALANCE'

      // Wrap in FeatureError
      const featureError = new FeatureError(
        original.message,
        original,
        { number: 200, name: '200-check-balance.js', fn: async () => {}, path: '/path' },
        {},
        original.statusCode
      )

      // Custom properties accessible via originalError
      const unwrapped = featureError.originalError as Error & {
        statusCode: number
        code: string
      }
      expect(unwrapped.code).toBe('INSUFFICIENT_BALANCE')
      expect(unwrapped.statusCode).toBe(400)

      // Step info available for debugging
      expect(featureError.step?.number).toBe(200)
      expect(featureError.step?.name).toBe('200-check-balance.js')
    })
  })

  describe('Runtime error debugging', () => {
    it('should show step info in console for debugging', () => {
      const original = new Error('Out of stock')
      const step: StepInfo = {
        number: 300,
        name: '300-check-stock.js',
        fn: async () => {},
        path: '/app/features/api/orders/@post/steps/300-check-stock.js'
      }

      const featureError = new FeatureError(
        original.message,
        original,
        step,
        {},
        500
      )

      // Developers can easily identify where the error occurred
      const debugInfo = `Error in step ${featureError.step?.number} (${featureError.step?.name}): ${featureError.message}`
      expect(debugInfo).toBe('Error in step 300 (300-check-stock.js): Out of stock')
    })

    it('should provide access to original stack trace', () => {
      const original = new Error('Database timeout')
      const step: StepInfo = {
        number: 400,
        name: '400-save-order.js',
        fn: async () => {},
        path: '/path'
      }

      const featureError = new FeatureError(
        original.message,
        original,
        step
      )

      // Original stack trace is preserved
      expect(featureError.originalError?.stack).toBeDefined()
      expect(featureError.originalError?.stack).toContain('Database timeout')
    })
  })
})
