/**
 * Auto-Error Handler Test
 *
 * Simplified Express-style error handling tests
 */

import { ServerResponse } from 'http'
import { AutoErrorHandler } from '../../src/feature/auto-error-handler'
import { FeatureError, StepInfo } from '../../src/feature/types'

describe('Auto-Error Handler', () => {
  let mockRes: ServerResponse

  beforeEach(() => {
    mockRes = {
      statusCode: 0,
      setHeader: jest.fn(),
      end: jest.fn(),
    } as any
  })

  describe('Error catching and HTTP response', () => {
    it('should convert FeatureError to correct HTTP response', () => {
      const step: StepInfo = {
        number: 200,
        name: '200-process.js',
        path: '/path/to/200-process.js',
        fn: async () => {},
      }

      const error = new FeatureError('Feature execution failed', undefined, step, undefined, 500)

      AutoErrorHandler.handle(error, mockRes)

      expect(mockRes.statusCode).toBe(500)
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json')
      expect(mockRes.end).toHaveBeenCalled()

      const response = JSON.parse((mockRes.end as jest.Mock).mock.calls[0][0])
      expect(response.error.message).toBe('Feature execution failed')
      expect(response.error.statusCode).toBe(500)
      expect(response.error.step.number).toBe(200)
      expect(response.error.step.name).toBe('200-process.js')
    })

    it('should handle error with statusCode property', () => {
      const error = new Error('Not found') as Error & { statusCode: number }
      error.statusCode = 404

      AutoErrorHandler.handle(error, mockRes)

      expect(mockRes.statusCode).toBe(404)

      const response = JSON.parse((mockRes.end as jest.Mock).mock.calls[0][0])
      expect(response.error.message).toBe('Not found')
      expect(response.error.statusCode).toBe(404)
    })

    it('should default to 500 for generic Error', () => {
      const error = new Error('Unexpected error')

      AutoErrorHandler.handle(error, mockRes)

      expect(mockRes.statusCode).toBe(500)

      const response = JSON.parse((mockRes.end as jest.Mock).mock.calls[0][0])
      expect(response.error.message).toBe('Unexpected error')
      expect(response.error.statusCode).toBe(500)
    })
  })

  describe('Step information inclusion', () => {
    it('should include step information in response if FeatureError has step info', () => {
      const step: StepInfo = {
        number: 300,
        name: '300-validate.js',
        path: '/path/to/300-validate.js',
        fn: async () => {},
      }

      const error = new FeatureError('Step failed', undefined, step)

      AutoErrorHandler.handle(error, mockRes)

      const response = JSON.parse((mockRes.end as jest.Mock).mock.calls[0][0])
      expect(response.error.step).toBeDefined()
      expect(response.error.step.number).toBe(300)
      expect(response.error.step.name).toBe('300-validate.js')
    })

    it('should not include step if FeatureError has no step info', () => {
      const error = new FeatureError('General error')

      AutoErrorHandler.handle(error, mockRes)

      const response = JSON.parse((mockRes.end as jest.Mock).mock.calls[0][0])
      expect(response.error.step).toBeUndefined()
    })
  })

  describe('Development vs Production environment', () => {
    const originalEnv = process.env.NODE_ENV

    afterEach(() => {
      process.env.NODE_ENV = originalEnv
    })

    it('should include stack trace in development environment', () => {
      process.env.NODE_ENV = 'development'

      const error = new Error('Test error')

      AutoErrorHandler.handle(error, mockRes)

      const response = JSON.parse((mockRes.end as jest.Mock).mock.calls[0][0])
      expect(response.error.stack).toBeDefined()
      expect(response.error.stack).toContain('Error: Test error')
    })

    it('should not include stack trace in production environment', () => {
      process.env.NODE_ENV = 'production'

      const error = new Error('Test error')

      AutoErrorHandler.handle(error, mockRes)

      const response = JSON.parse((mockRes.end as jest.Mock).mock.calls[0][0])
      expect(response.error.stack).toBeUndefined()
    })

    it('should prefer original error stack for FeatureError in development', () => {
      process.env.NODE_ENV = 'development'

      const originalError = new Error('Original error')
      const step: StepInfo = { number: 100, name: '100-test.js', path: '/path', fn: async () => {} }
      const featureError = new FeatureError(originalError.message, originalError, step)

      AutoErrorHandler.handle(featureError, mockRes)

      const response = JSON.parse((mockRes.end as jest.Mock).mock.calls[0][0])
      expect(response.error.stack).toBeDefined()
      expect(response.error.stack).toContain('Original error')
    })
  })

  describe('Response format', () => {
    it('error response should have Content-Type as application/json', () => {
      const error = new Error('Test error')

      AutoErrorHandler.handle(error, mockRes)

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json')
    })

    it('error response should be valid JSON', () => {
      const error = new FeatureError('Test error')

      AutoErrorHandler.handle(error, mockRes)

      const responseStr = (mockRes.end as jest.Mock).mock.calls[0][0]
      expect(() => JSON.parse(responseStr)).not.toThrow()
    })
  })

  describe('Error message handling', () => {
    it('should use default message if error message is missing', () => {
      const error = new Error()
      error.message = ''

      AutoErrorHandler.handle(error, mockRes)

      const response = JSON.parse((mockRes.end as jest.Mock).mock.calls[0][0])
      expect(response.error.message).toBe('An unexpected error occurred')
    })

    it('should handle error messages with special characters correctly', () => {
      const specialMessage = 'Error: "test" failed with \\\\ and \\n newline'
      const error = new Error(specialMessage)

      AutoErrorHandler.handle(error, mockRes)

      const response = JSON.parse((mockRes.end as jest.Mock).mock.calls[0][0])
      expect(response.error.message).toBe(specialMessage)
    })
  })

  describe('Custom FeatureError with different status codes', () => {
    it('should handle 401 Unauthorized error', () => {
      const error = new FeatureError('Unauthorized', undefined, undefined, undefined, 401)

      AutoErrorHandler.handle(error, mockRes)

      expect(mockRes.statusCode).toBe(401)
    })

    it('should handle 403 Forbidden error', () => {
      const error = new FeatureError('Forbidden', undefined, undefined, undefined, 403)

      AutoErrorHandler.handle(error, mockRes)

      expect(mockRes.statusCode).toBe(403)
    })

    it('should handle 404 Not Found error', () => {
      const error = new FeatureError('Not found', undefined, undefined, undefined, 404)

      AutoErrorHandler.handle(error, mockRes)

      expect(mockRes.statusCode).toBe(404)

      const response = JSON.parse((mockRes.end as jest.Mock).mock.calls[0][0])
      expect(response.error.message).toBe('Not found')
    })
  })
})
