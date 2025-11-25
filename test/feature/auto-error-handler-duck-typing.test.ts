/**
 * Auto Error Handler Duck Typing Tests
 *
 * Tests for duck typing support in AutoErrorHandler
 */

import { ServerResponse } from 'http'
import { AutoErrorHandler } from '../../src/feature/auto-error-handler'
import { FeatureError, ValidationError } from '../../src/feature/types'

// Mock ServerResponse
const createMockResponse = () => {
  const chunks: Buffer[] = []
  let responseStatusCode = 200
  const headers: Record<string, string> = {}

  const res = {
    get statusCode() {
      return responseStatusCode
    },
    set statusCode(code: number) {
      responseStatusCode = code
    },
    setHeader(name: string, value: string) {
      headers[name] = value
    },
    end(data?: string) {
      if (data) {
        chunks.push(Buffer.from(data))
      }
    },
    getBody(): string {
      return Buffer.concat(chunks).toString()
    },
    getHeaders() {
      return headers
    },
  } as unknown as ServerResponse & { getBody(): string; getHeaders(): Record<string, string> }

  return res
}

describe('AutoErrorHandler Duck Typing', () => {
  beforeEach(() => {
    // Suppress console.error in tests
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('with duck-typed FeatureError', () => {
    it('should handle duck-typed FeatureError with statusCode', () => {
      // Given: Simulated FeatureError from different module instance
      const duckTypedError = Object.create(Error.prototype, {
        name: { value: 'FeatureError', writable: true },
        message: { value: 'Step failed', writable: true },
        statusCode: { value: 422, writable: true },
        step: {
          value: { number: 100, name: 'validate' },
          writable: true,
        },
      })
      duckTypedError.stack = new Error().stack

      const res = createMockResponse()

      // When: AutoErrorHandler handles the error
      AutoErrorHandler.handle(duckTypedError, res)

      // Then: Should use the statusCode from duck-typed error
      expect(res.statusCode).toBe(422)
      const body = JSON.parse(res.getBody())
      expect(body.message).toBe('Step failed')
    })

    it('should include step info from duck-typed FeatureError', () => {
      // Given: Simulated FeatureError with step info
      const duckTypedError = Object.create(Error.prototype, {
        name: { value: 'FeatureError', writable: true },
        message: { value: 'Validation failed', writable: true },
        statusCode: { value: 400, writable: true },
        step: {
          value: { number: 100, name: 'validate-input' },
          writable: true,
        },
      })

      const res = createMockResponse()

      // When: AutoErrorHandler handles the error
      AutoErrorHandler.handle(duckTypedError, res)

      // Then: Should include step details
      const body = JSON.parse(res.getBody())
      expect(body.details?.step?.number).toBe(100)
      expect(body.details?.step?.name).toBe('validate-input')
    })
  })

  describe('with duck-typed ValidationError', () => {
    it('should handle duck-typed ValidationError', () => {
      // Given: Simulated ValidationError from different module instance
      const duckTypedError = Object.create(Error.prototype, {
        name: { value: 'ValidationError', writable: true },
        message: { value: 'Email is invalid', writable: true },
        statusCode: { value: 400, writable: true },
      })

      const res = createMockResponse()

      // When: AutoErrorHandler handles the error
      AutoErrorHandler.handle(duckTypedError, res)

      // Then: Should return 400 status
      expect(res.statusCode).toBe(400)
      const body = JSON.parse(res.getBody())
      expect(body.error).toBe('ValidationError')
      expect(body.message).toBe('Email is invalid')
    })
  })

  describe('with real errors (same module)', () => {
    it('should still work with real FeatureError', () => {
      // Given: Real FeatureError from same module
      const realError = new FeatureError('Real feature error', undefined, undefined, undefined, 403)

      const res = createMockResponse()

      // When: AutoErrorHandler handles the error
      AutoErrorHandler.handle(realError, res)

      // Then: Should handle correctly
      expect(res.statusCode).toBe(403)
      const body = JSON.parse(res.getBody())
      expect(body.message).toBe('Real feature error')
    })

    it('should still work with real ValidationError', () => {
      // Given: Real ValidationError from same module
      const realError = new ValidationError('Invalid input')

      const res = createMockResponse()

      // When: AutoErrorHandler handles the error
      AutoErrorHandler.handle(realError, res)

      // Then: Should handle correctly
      expect(res.statusCode).toBe(400)
      const body = JSON.parse(res.getBody())
      expect(body.error).toBe('ValidationError')
    })
  })

  describe('with generic errors', () => {
    it('should use 500 for regular Error', () => {
      // Given: Regular Error
      const regularError = new Error('Database connection failed')

      const res = createMockResponse()

      // When: AutoErrorHandler handles the error
      AutoErrorHandler.handle(regularError, res)

      // Then: Should return 500
      expect(res.statusCode).toBe(500)
      const body = JSON.parse(res.getBody())
      expect(body.error).toBe('Error')
    })
  })
})
