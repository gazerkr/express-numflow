/**
 * Retry Mechanism Tests
 *
 * Tests for retry() function and RETRY symbol
 */

import { retry, RETRY, isRetrySignal, RetrySignal } from '../../src/feature/retry'

describe('Retry Mechanism', () => {
  describe('retry() function', () => {
    it('should return RETRY symbol when called without options', () => {
      // When: Call retry without options
      const result = retry()

      // Then: Returns RETRY symbol
      expect(result).toBe(RETRY)
      expect(typeof result).toBe('symbol')
    })

    it('should return RETRY symbol when called with empty options', () => {
      // When: Call retry with empty object
      const result = retry({})

      // Then: Returns RETRY symbol
      expect(result).toBe(RETRY)
    })

    it('should return RetrySignal object when delay is specified', () => {
      // When: Call retry with delay option
      const result = retry({ delay: 1000 })

      // Then: Returns RetrySignal object
      expect(result).not.toBe(RETRY)
      expect(typeof result).toBe('object')
      expect((result as RetrySignal).__retry).toBe(true)
      expect((result as RetrySignal).delay).toBe(1000)
    })

    it('should return RetrySignal object when maxAttempts is specified', () => {
      // When: Call retry with maxAttempts option
      const result = retry({ maxAttempts: 3 })

      // Then: Returns RetrySignal object
      expect(result).not.toBe(RETRY)
      expect((result as RetrySignal).__retry).toBe(true)
      expect((result as RetrySignal).maxAttempts).toBe(3)
    })

    it('should return RetrySignal object with both delay and maxAttempts', () => {
      // When: Call retry with both options
      const result = retry({ delay: 2000, maxAttempts: 5 })

      // Then: Returns RetrySignal object with both values
      expect(result).not.toBe(RETRY)
      expect((result as RetrySignal).__retry).toBe(true)
      expect((result as RetrySignal).delay).toBe(2000)
      expect((result as RetrySignal).maxAttempts).toBe(5)
    })

    it('should handle delay: 0', () => {
      // When: Call retry with delay: 0
      const result = retry({ delay: 0 })

      // Then: Returns RetrySignal with delay: 0
      expect((result as RetrySignal).__retry).toBe(true)
      expect((result as RetrySignal).delay).toBe(0)
    })

    it('should handle maxAttempts: 1', () => {
      // When: Call retry with maxAttempts: 1
      const result = retry({ maxAttempts: 1 })

      // Then: Returns RetrySignal with maxAttempts: 1
      expect((result as RetrySignal).__retry).toBe(true)
      expect((result as RetrySignal).maxAttempts).toBe(1)
    })
  })

  describe('RETRY symbol', () => {
    it('should be a unique symbol', () => {
      // Then: RETRY is a symbol
      expect(typeof RETRY).toBe('symbol')
    })

    it('should be a global symbol for numflow.retry', () => {
      // Then: Can be retrieved using Symbol.for
      const retrieved = Symbol.for('numflow.retry')
      expect(retrieved).toBe(RETRY)
    })

    it('should be different from other symbols', () => {
      // Given: Other symbols
      const other1 = Symbol('retry')
      const other2 = Symbol.for('other.retry')

      // Then: RETRY is different
      expect(RETRY).not.toBe(other1)
      expect(RETRY).not.toBe(other2)
    })
  })

  describe('isRetrySignal() function', () => {
    it('should return true for RETRY symbol', () => {
      // When: Check RETRY symbol
      const result = isRetrySignal(RETRY)

      // Then: Returns true
      expect(result).toBe(true)
    })

    it('should return true for RetrySignal object', () => {
      // Given: RetrySignal object
      const signal = retry({ delay: 1000 })

      // When: Check RetrySignal
      const result = isRetrySignal(signal)

      // Then: Returns true
      expect(result).toBe(true)
    })

    it('should return false for undefined', () => {
      // When: Check undefined
      const result = isRetrySignal(undefined)

      // Then: Returns false
      expect(result).toBe(false)
    })

    it('should return false for null', () => {
      // When: Check null
      const result = isRetrySignal(null)

      // Then: Returns false
      expect(result).toBe(false)
    })

    it('should return false for empty object', () => {
      // When: Check empty object
      const result = isRetrySignal({})

      // Then: Returns false
      expect(result).toBe(false)
    })

    it('should return false for object without __retry', () => {
      // When: Check object without __retry
      const result = isRetrySignal({ delay: 1000 })

      // Then: Returns false
      expect(result).toBe(false)
    })

    it('should return false for object with __retry: false', () => {
      // When: Check object with __retry: false
      const result = isRetrySignal({ __retry: false })

      // Then: Returns false
      expect(result).toBe(false)
    })

    it('should return false for string', () => {
      // When: Check string
      const result = isRetrySignal('retry')

      // Then: Returns false
      expect(result).toBe(false)
    })

    it('should return false for number', () => {
      // When: Check number
      const result = isRetrySignal(123)

      // Then: Returns false
      expect(result).toBe(false)
    })

    it('should return false for boolean', () => {
      // When: Check boolean
      const result = isRetrySignal(true)

      // Then: Returns false
      expect(result).toBe(false)
    })
  })

  describe('RetrySignal type', () => {
    it('should have __retry property set to true', () => {
      // Given: RetrySignal
      const signal = retry({ delay: 1000 }) as RetrySignal

      // Then: __retry is true
      expect(signal.__retry).toBe(true)
    })

    it('should allow undefined delay', () => {
      // Given: RetrySignal without delay
      const signal = retry({ maxAttempts: 3 }) as RetrySignal

      // Then: delay is undefined
      expect(signal.delay).toBeUndefined()
    })

    it('should allow undefined maxAttempts', () => {
      // Given: RetrySignal without maxAttempts
      const signal = retry({ delay: 1000 }) as RetrySignal

      // Then: maxAttempts is undefined
      expect(signal.maxAttempts).toBeUndefined()
    })
  })

  describe('Performance characteristics', () => {
    it('should be fast when returning RETRY symbol', () => {
      // Given: Performance measurement
      const iterations = 100000
      const start = performance.now()

      // When: Call retry() without options many times
      for (let i = 0; i < iterations; i++) {
        retry()
      }

      const end = performance.now()
      const duration = end - start

      // Then: Should be very fast (< 100ms for 100k calls)
      expect(duration).toBeLessThan(100)
    })

    it('should be fast when returning RetrySignal object', () => {
      // Given: Performance measurement
      const iterations = 100000
      const start = performance.now()

      // When: Call retry() with options many times
      for (let i = 0; i < iterations; i++) {
        retry({ delay: 1000 })
      }

      const end = performance.now()
      const duration = end - start

      // Then: Should be reasonably fast (< 200ms for 100k calls)
      expect(duration).toBeLessThan(200)
    })
  })
})
