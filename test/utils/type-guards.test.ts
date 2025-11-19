/**
 * Type Guards Tests
 *
 * Tests for all type guard utility functions
 */

import {
  isInternalRequest,
  isInternalResponse,
  isInternalSocket,
  isInternalError,
  hasParams,
  hasQuery,
  hasReq,
  hasApp,
  hasStatusCode,
  hasCode,
  hasValidationErrors,
} from '../../src/utils/type-guards'

describe('Type Guards', () => {
  describe('isInternalRequest()', () => {
    it('should return true for object', () => {
      // Given: Request-like object
      const req = { url: '/', method: 'GET' }

      // When: Check if InternalRequest
      const result = isInternalRequest(req)

      // Then: Returns true
      expect(result).toBe(true)
    })

    it('should return false for null', () => {
      // When: Check null
      const result = isInternalRequest(null)

      // Then: Returns false
      expect(result).toBe(false)
    })

    it('should return false for undefined', () => {
      // When: Check undefined
      const result = isInternalRequest(undefined)

      // Then: Returns false
      expect(result).toBe(false)
    })

    it('should return false for primitive values', () => {
      // When & Then: Returns false for primitives
      expect(isInternalRequest('string')).toBe(false)
      expect(isInternalRequest(123)).toBe(false)
      expect(isInternalRequest(true)).toBe(false)
    })

    it('should return true for empty object', () => {
      // When: Check empty object
      const result = isInternalRequest({})

      // Then: Returns true
      expect(result).toBe(true)
    })
  })

  describe('isInternalResponse()', () => {
    it('should return true for object', () => {
      // Given: Response-like object
      const res = { statusCode: 200, setHeader: () => {} }

      // When: Check if InternalResponse
      const result = isInternalResponse(res)

      // Then: Returns true
      expect(result).toBe(true)
    })

    it('should return false for null', () => {
      // When: Check null
      const result = isInternalResponse(null)

      // Then: Returns false
      expect(result).toBe(false)
    })

    it('should return false for undefined', () => {
      // When: Check undefined
      const result = isInternalResponse(undefined)

      // Then: Returns false
      expect(result).toBe(false)
    })

    it('should return false for primitive values', () => {
      // When & Then: Returns false for primitives
      expect(isInternalResponse('string')).toBe(false)
      expect(isInternalResponse(123)).toBe(false)
      expect(isInternalResponse(false)).toBe(false)
    })
  })

  describe('isInternalSocket()', () => {
    it('should return true for object', () => {
      // Given: Socket-like object
      const socket = { encrypted: true, localAddress: '127.0.0.1' }

      // When: Check if InternalSocket
      const result = isInternalSocket(socket)

      // Then: Returns true
      expect(result).toBe(true)
    })

    it('should return false for null', () => {
      // When: Check null
      const result = isInternalSocket(null)

      // Then: Returns false
      expect(result).toBe(false)
    })

    it('should return false for undefined', () => {
      // When: Check undefined
      const result = isInternalSocket(undefined)

      // Then: Returns false
      expect(result).toBe(false)
    })

    it('should return false for primitive values', () => {
      // When & Then: Returns false for primitives
      expect(isInternalSocket('string')).toBe(false)
      expect(isInternalSocket(123)).toBe(false)
    })
  })

  describe('isInternalError()', () => {
    it('should return true for Error instance', () => {
      // Given: Error
      const error = new Error('Test error')

      // When: Check if InternalError
      const result = isInternalError(error)

      // Then: Returns true
      expect(result).toBe(true)
    })

    it('should return true for custom Error subclasses', () => {
      // Given: Custom error class
      class CustomError extends Error {}
      const error = new CustomError('Test')

      // When: Check if InternalError
      const result = isInternalError(error)

      // Then: Returns true
      expect(result).toBe(true)
    })

    it('should return false for non-Error objects', () => {
      // Given: Object that looks like error
      const fakeError = { message: 'Error', name: 'Error' }

      // When: Check if InternalError
      const result = isInternalError(fakeError as any)

      // Then: Returns false
      expect(result).toBe(false)
    })
  })

  describe('hasParams()', () => {
    it('should return true when params exists', () => {
      // Given: Request with params
      const req = { params: { id: '123' } } as any

      // When: Check if has params
      const result = hasParams(req)

      // Then: Returns true
      expect(result).toBe(true)
    })

    it('should return false when params does not exist', () => {
      // Given: Request without params
      const req = {} as any

      // When: Check if has params
      const result = hasParams(req)

      // Then: Returns false
      expect(result).toBe(false)
    })

    it('should return false when params is not an object', () => {
      // Given: Request with non-object params
      const req = { params: 'not-object' } as any

      // When: Check if has params
      const result = hasParams(req)

      // Then: Returns false
      expect(result).toBe(false)
    })

    it('should return true for empty params object', () => {
      // Given: Request with empty params
      const req = { params: {} } as any

      // When: Check if has params
      const result = hasParams(req)

      // Then: Returns true
      expect(result).toBe(true)
    })
  })

  describe('hasQuery()', () => {
    it('should return true when query exists', () => {
      // Given: Request with query
      const req = { query: { search: 'test' } } as any

      // When: Check if has query
      const result = hasQuery(req)

      // Then: Returns true
      expect(result).toBe(true)
    })

    it('should return false when query does not exist', () => {
      // Given: Request without query
      const req = {} as any

      // When: Check if has query
      const result = hasQuery(req)

      // Then: Returns false
      expect(result).toBe(false)
    })

    it('should return false when query is not an object', () => {
      // Given: Request with non-object query
      const req = { query: 'not-object' } as any

      // When: Check if has query
      const result = hasQuery(req)

      // Then: Returns false
      expect(result).toBe(false)
    })

    it('should return true for empty query object', () => {
      // Given: Request with empty query
      const req = { query: {} } as any

      // When: Check if has query
      const result = hasQuery(req)

      // Then: Returns true
      expect(result).toBe(true)
    })
  })

  describe('hasReq()', () => {
    it('should return true when req exists', () => {
      // Given: Response with req
      const res = { req: { url: '/' } } as any

      // When: Check if has req
      const result = hasReq(res)

      // Then: Returns true
      expect(result).toBe(true)
    })

    it('should return false when req does not exist', () => {
      // Given: Response without req
      const res = {} as any

      // When: Check if has req
      const result = hasReq(res)

      // Then: Returns false
      expect(result).toBe(false)
    })

    it('should return false when req is not an object', () => {
      // Given: Response with non-object req
      const res = { req: 'not-object' } as any

      // When: Check if has req
      const result = hasReq(res)

      // Then: Returns false
      expect(result).toBe(false)
    })

    it('should return true for empty req object', () => {
      // Given: Response with empty req
      const res = { req: {} } as any

      // When: Check if has req
      const result = hasReq(res)

      // Then: Returns true
      expect(result).toBe(true)
    })
  })

  describe('hasApp()', () => {
    it('should return true when app exists', () => {
      // Given: Response with app
      const res = { app: { locals: {} } } as any

      // When: Check if has app
      const result = hasApp(res)

      // Then: Returns true
      expect(result).toBe(true)
    })

    it('should return false when app does not exist', () => {
      // Given: Response without app
      const res = {} as any

      // When: Check if has app
      const result = hasApp(res)

      // Then: Returns false
      expect(result).toBe(false)
    })

    it('should return false when app is not an object', () => {
      // Given: Response with non-object app
      const res = { app: 'not-object' } as any

      // When: Check if has app
      const result = hasApp(res)

      // Then: Returns false
      expect(result).toBe(false)
    })
  })

  describe('hasStatusCode()', () => {
    it('should return true when statusCode exists as number', () => {
      // Given: Error with statusCode
      const error = new Error('Test')
      ;(error as any).statusCode = 404

      // When: Check if has statusCode
      const result = hasStatusCode(error)

      // Then: Returns true
      expect(result).toBe(true)
    })

    it('should return false when statusCode does not exist', () => {
      // Given: Error without statusCode
      const error = new Error('Test')

      // When: Check if has statusCode
      const result = hasStatusCode(error)

      // Then: Returns false
      expect(result).toBe(false)
    })

    it('should return false when statusCode is not a number', () => {
      // Given: Error with non-number statusCode
      const error = new Error('Test')
      ;(error as any).statusCode = '404'

      // When: Check if has statusCode
      const result = hasStatusCode(error)

      // Then: Returns false
      expect(result).toBe(false)
    })

    it('should return true for statusCode 0', () => {
      // Given: Error with statusCode 0
      const error = new Error('Test')
      ;(error as any).statusCode = 0

      // When: Check if has statusCode
      const result = hasStatusCode(error)

      // Then: Returns true
      expect(result).toBe(true)
    })
  })

  describe('hasCode()', () => {
    it('should return true when code exists as string', () => {
      // Given: Error with code
      const error = new Error('Test')
      ;(error as any).code = 'ENOENT'

      // When: Check if has code
      const result = hasCode(error)

      // Then: Returns true
      expect(result).toBe(true)
    })

    it('should return false when code does not exist', () => {
      // Given: Error without code
      const error = new Error('Test')

      // When: Check if has code
      const result = hasCode(error)

      // Then: Returns false
      expect(result).toBe(false)
    })

    it('should return false when code is not a string', () => {
      // Given: Error with non-string code
      const error = new Error('Test')
      ;(error as any).code = 123

      // When: Check if has code
      const result = hasCode(error)

      // Then: Returns false
      expect(result).toBe(false)
    })

    it('should return true for empty string code', () => {
      // Given: Error with empty string code
      const error = new Error('Test')
      ;(error as any).code = ''

      // When: Check if has code
      const result = hasCode(error)

      // Then: Returns true
      expect(result).toBe(true)
    })
  })

  describe('hasValidationErrors()', () => {
    it('should return true when validationErrors exists', () => {
      // Given: Error with validationErrors
      const error = new Error('Test')
      ;(error as any).validationErrors = { email: ['Required'] }

      // When: Check if has validationErrors
      const result = hasValidationErrors(error)

      // Then: Returns true
      expect(result).toBe(true)
    })

    it('should return false when validationErrors does not exist', () => {
      // Given: Error without validationErrors
      const error = new Error('Test')

      // When: Check if has validationErrors
      const result = hasValidationErrors(error)

      // Then: Returns false
      expect(result).toBe(false)
    })

    it('should return false when validationErrors is null', () => {
      // Given: Error with null validationErrors
      const error = new Error('Test')
      ;(error as any).validationErrors = null

      // When: Check if has validationErrors
      const result = hasValidationErrors(error)

      // Then: Returns false
      expect(result).toBe(false)
    })

    it('should return false when validationErrors is undefined', () => {
      // Given: Error with undefined validationErrors
      const error = new Error('Test')
      ;(error as any).validationErrors = undefined

      // When: Check if has validationErrors
      const result = hasValidationErrors(error)

      // Then: Returns false
      expect(result).toBe(false)
    })

    it('should return true for empty validationErrors object', () => {
      // Given: Error with empty validationErrors
      const error = new Error('Test')
      ;(error as any).validationErrors = {}

      // When: Check if has validationErrors
      const result = hasValidationErrors(error)

      // Then: Returns true
      expect(result).toBe(true)
    })

    it('should return true for validationErrors array', () => {
      // Given: Error with validationErrors array
      const error = new Error('Test')
      ;(error as any).validationErrors = ['Error 1', 'Error 2']

      // When: Check if has validationErrors
      const result = hasValidationErrors(error)

      // Then: Returns true
      expect(result).toBe(true)
    })

    it('should return true for validationErrors as string', () => {
      // Given: Error with validationErrors string
      const error = new Error('Test')
      ;(error as any).validationErrors = 'Validation failed'

      // When: Check if has validationErrors
      const result = hasValidationErrors(error)

      // Then: Returns true
      expect(result).toBe(true)
    })
  })

  describe('Type guard combinations', () => {
    it('should work with multiple guards on same object', () => {
      // Given: Request with both params and query
      const req = {
        params: { id: '123' },
        query: { sort: 'asc' },
      } as any

      // When & Then: Both guards return true
      expect(hasParams(req)).toBe(true)
      expect(hasQuery(req)).toBe(true)
    })

    it('should work independently', () => {
      // Given: Request with only params
      const req = { params: { id: '123' } } as any

      // When & Then: Only params guard returns true
      expect(hasParams(req)).toBe(true)
      expect(hasQuery(req)).toBe(false)
    })

    it('should handle error with multiple properties', () => {
      // Given: Error with statusCode and code
      const error = new Error('Test')
      ;(error as any).statusCode = 500
      ;(error as any).code = 'INTERNAL_ERROR'

      // When & Then: Both guards return true
      expect(hasStatusCode(error)).toBe(true)
      expect(hasCode(error)).toBe(true)
    })
  })
})
