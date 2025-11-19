/**
 * Auto-Error Handler Tests
 *
 * Tests for AutoErrorHandler class
 */

import { AutoErrorHandler } from '../../src/feature/auto-error-handler'
import { FeatureError, ValidationError } from '../../src/feature/types'
import { ServerResponse } from 'http'

describe('AutoErrorHandler', () => {
  let mockRes: any
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    // Create mock response object
    mockRes = {
      statusCode: 200,
      headers: {},
      setHeader: jest.fn((key: string, value: string) => {
        mockRes.headers[key] = value
      }),
      end: jest.fn(),
    }

    // Spy on console.error
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  describe('handle() method', () => {
    it('should handle generic Error', () => {
      // Given: Generic error
      const error = new Error('Something went wrong')

      // When: Handle error
      AutoErrorHandler.handle(error, mockRes as ServerResponse)

      // Then: Sends 500 response
      expect(mockRes.statusCode).toBe(500)
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json')
      expect(mockRes.end).toHaveBeenCalled()

      const responseBody = JSON.parse(mockRes.end.mock.calls[0][0])
      expect(responseBody.success).toBe(false)
      expect(responseBody.error).toBe('Error')
      expect(responseBody.message).toBe('Something went wrong')
    })

    it('should handle FeatureError', () => {
      // Given: FeatureError
      const error = new FeatureError('Validation failed', undefined, undefined, undefined, 400)

      // When: Handle error
      AutoErrorHandler.handle(error, mockRes as ServerResponse)

      // Then: Sends 400 response
      expect(mockRes.statusCode).toBe(400)
      const responseBody = JSON.parse(mockRes.end.mock.calls[0][0])
      expect(responseBody.error).toBe('FeatureError')
      expect(responseBody.message).toBe('Validation failed')
    })

    it('should include step information for FeatureError', () => {
      // Given: FeatureError with step info
      const error = new FeatureError(
        'Step failed',
        undefined,
        { number: 100, name: 'validate-input', fn: async () => {}, path: '/test' },
        undefined,
        400
      )

      // When: Handle error
      AutoErrorHandler.handle(error, mockRes as ServerResponse)

      // Then: Response includes step details
      const responseBody = JSON.parse(mockRes.end.mock.calls[0][0])
      expect(responseBody.details).toBeDefined()
      expect(responseBody.details.step).toEqual({
        number: 100,
        name: 'validate-input',
      })
    })

    it('should handle ValidationError', () => {
      // Given: ValidationError
      const error = new ValidationError('Invalid input', {
        email: ['Email is required'],
      })

      // When: Handle error
      AutoErrorHandler.handle(error, mockRes as ServerResponse)

      // Then: Sends 400 response
      expect(mockRes.statusCode).toBe(400)
      const responseBody = JSON.parse(mockRes.end.mock.calls[0][0])
      expect(responseBody.error).toBe('ValidationError')
      expect(responseBody.message).toBe('Invalid input')
    })

    it('should handle error without message', () => {
      // Given: Error without message
      const error = new Error()

      // When: Handle error
      AutoErrorHandler.handle(error, mockRes as ServerResponse)

      // Then: Uses default message
      const responseBody = JSON.parse(mockRes.end.mock.calls[0][0])
      expect(responseBody.message).toBe('An unexpected error occurred')
    })

    it('should include stack trace in development environment', () => {
      // Given: Development environment
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      const error = new Error('Test error')

      // When: Handle error
      AutoErrorHandler.handle(error, mockRes as ServerResponse)

      // Then: Stack trace is included
      const responseBody = JSON.parse(mockRes.end.mock.calls[0][0])
      expect(responseBody.stack).toBeDefined()
      expect(responseBody.stack).toContain('Error: Test error')

      // Cleanup
      process.env.NODE_ENV = originalEnv
    })

    it('should not include stack trace in production environment', () => {
      // Given: Production environment
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      const error = new Error('Test error')

      // When: Handle error
      AutoErrorHandler.handle(error, mockRes as ServerResponse)

      // Then: Stack trace is not included
      const responseBody = JSON.parse(mockRes.end.mock.calls[0][0])
      expect(responseBody.stack).toBeUndefined()

      // Cleanup
      process.env.NODE_ENV = originalEnv
    })

    it('should not include details when empty', () => {
      // Given: Error without details
      const error = new Error('Test error')

      // When: Handle error
      AutoErrorHandler.handle(error, mockRes as ServerResponse)

      // Then: details field is undefined
      const responseBody = JSON.parse(mockRes.end.mock.calls[0][0])
      expect(responseBody.details).toBeUndefined()
    })

    it('should log error to console', () => {
      // Given: Development environment
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      try {
        const error = new Error('Test error')

        // When: Handle error
        AutoErrorHandler.handle(error, mockRes as ServerResponse)

        // Then: Error is logged
        expect(consoleErrorSpy).toHaveBeenCalled()
        expect(consoleErrorSpy.mock.calls[0][0]).toContain('AutoErrorHandler')
      } finally {
        process.env.NODE_ENV = originalEnv
      }
    })

    it('should log step information for FeatureError', () => {
      // Given: Development environment
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      try {
        const error = new FeatureError(
          'Step failed',
          undefined,
          { number: 100, name: 'validate-input', fn: async () => {}, path: '/test' },
          undefined,
          400
        )

        // When: Handle error
        AutoErrorHandler.handle(error, mockRes as ServerResponse)

        // Then: Step is logged
        const logCalls = consoleErrorSpy.mock.calls.map((call) => call[0]).join(' ')
        expect(logCalls).toContain('Step: 100')
        expect(logCalls).toContain('validate-input')
      } finally {
        process.env.NODE_ENV = originalEnv
      }
    })

    it('should not log in test environment', () => {
      // Given: Test environment (already in test env)
      const error = new Error('Test error')

      // When: Handle error
      AutoErrorHandler.handle(error, mockRes as ServerResponse)

      // Then: Nothing logged in test environment
      expect(consoleErrorSpy).not.toHaveBeenCalled()
    })

    it('should not log when DISABLE_FEATURE_LOGS is true', () => {
      // Given: DISABLE_FEATURE_LOGS enabled
      const originalEnv = process.env.DISABLE_FEATURE_LOGS
      process.env.DISABLE_FEATURE_LOGS = 'true'
      const error = new Error('Test error')

      // Reset spy to check if it's called
      consoleErrorSpy.mockClear()

      // When: Handle error
      AutoErrorHandler.handle(error, mockRes as ServerResponse)

      // Then: Nothing logged
      expect(consoleErrorSpy).not.toHaveBeenCalled()

      // Cleanup
      if (originalEnv !== undefined) {
        process.env.DISABLE_FEATURE_LOGS = originalEnv
      } else {
        delete process.env.DISABLE_FEATURE_LOGS
      }
    })

    it('should set Content-Type to application/json', () => {
      // Given: Error
      const error = new Error('Test error')

      // When: Handle error
      AutoErrorHandler.handle(error, mockRes as ServerResponse)

      // Then: Content-Type is set
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json')
      expect(mockRes.headers['Content-Type']).toBe('application/json')
    })

    it('should send valid JSON response', () => {
      // Given: Error
      const error = new Error('Test error')

      // When: Handle error
      AutoErrorHandler.handle(error, mockRes as ServerResponse)

      // Then: Response is valid JSON
      const responseBody = mockRes.end.mock.calls[0][0]
      expect(() => JSON.parse(responseBody)).not.toThrow()

      const parsed = JSON.parse(responseBody)
      expect(parsed).toHaveProperty('success')
      expect(parsed).toHaveProperty('error')
      expect(parsed).toHaveProperty('message')
    })

    it('should always set success to false', () => {
      // Given: Various errors
      const errors = [
        new Error('Generic error'),
        new FeatureError('Feature error', undefined, undefined, undefined, 400),
        new ValidationError('Validation error'),
      ]

      errors.forEach((error) => {
        // Reset mock
        mockRes.end.mockClear()

        // When: Handle error
        AutoErrorHandler.handle(error, mockRes as ServerResponse)

        // Then: success is false
        const responseBody = JSON.parse(mockRes.end.mock.calls[0][0])
        expect(responseBody.success).toBe(false)
      })
    })

    it('should handle errors with stack trace', () => {
      // Given: Error with stack
      const error = new Error('Test error')
      error.stack = 'Error: Test error\n    at someFunction (file.ts:10:5)'

      // When: Handle error in development
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      AutoErrorHandler.handle(error, mockRes as ServerResponse)

      // Then: Stack is included
      const responseBody = JSON.parse(mockRes.end.mock.calls[0][0])
      expect(responseBody.stack).toContain('at someFunction')

      // Cleanup
      process.env.NODE_ENV = originalEnv
    })

    it('should handle errors without stack trace', () => {
      // Given: Error without stack
      const error = new Error('Test error')
      delete error.stack

      // When: Handle error
      AutoErrorHandler.handle(error, mockRes as ServerResponse)

      // Then: No error thrown
      expect(mockRes.end).toHaveBeenCalled()
    })
  })

  describe('Error response format', () => {
    it('should match expected response structure', () => {
      // Given: Error
      const error = new Error('Test error')

      // When: Handle error
      AutoErrorHandler.handle(error, mockRes as ServerResponse)

      // Then: Response structure is correct
      const responseBody = JSON.parse(mockRes.end.mock.calls[0][0])
      expect(responseBody).toMatchObject({
        success: false,
        error: expect.any(String),
        message: expect.any(String),
      })
    })

    it('should include all required fields', () => {
      // Given: Error
      const error = new Error('Test error')

      // When: Handle error
      AutoErrorHandler.handle(error, mockRes as ServerResponse)

      // Then: All required fields present
      const responseBody = JSON.parse(mockRes.end.mock.calls[0][0])
      expect(responseBody.success).toBeDefined()
      expect(responseBody.error).toBeDefined()
      expect(responseBody.message).toBeDefined()
    })
  })
})
