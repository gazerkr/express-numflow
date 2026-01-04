/**
 * Error Handling Documentation Scenarios Tests
 *
 * Verifies that all error handling scenarios described in
 * the documentation (docs/error-handling.ko.md) actually work.
 *
 * TDD: RED phase - Document-based scenario test writing
 */

import express, { Express, Request, Response, NextFunction } from 'express'
import request from 'supertest'
import { FeatureError } from '../src/http/types'

describe('Document Scenario: Express-style Error Handling', () => {
  let app: Express

  beforeEach(() => {
    app = express()
    app.use(express.json())
  })

  it('Throwing error with statusCode', async () => {
    app.get('/users/:id', (_req: Request, _res: Response, next: NextFunction) => {
      const error = new Error('User not found') as Error & { statusCode: number }
      error.statusCode = 404
      next(error)
    })

    // Global error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const statusCode = err.statusCode || 500
      res.status(statusCode).json({
        success: false,
        error: err.message
      })
    })

    const response = await request(app).get('/users/123')

    expect(response.status).toBe(404)
    expect(response.body.error).toBe('User not found')
  })

  it('Processing as 500 when throwing without statusCode', async () => {
    app.get('/error', (_req: Request, _res: Response, next: NextFunction) => {
      next(new Error('Something went wrong'))
    })

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const statusCode = err.statusCode || 500
      res.status(statusCode).json({
        success: false,
        error: err.message
      })
    })

    const response = await request(app).get('/error')

    expect(response.status).toBe(500)
    expect(response.body.error).toBe('Something went wrong')
  })

  it('Using additional properties like validationErrors and code', async () => {
    app.post('/users', (_req: Request, _res: Response, next: NextFunction) => {
      const error = new Error('Validation failed') as any
      error.statusCode = 400
      error.validationErrors = {
        email: ['Please enter a valid email'],
        password: ['Password must be at least 8 characters']
      }
      next(error)
    })

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const statusCode = err.statusCode || 500

      res.status(statusCode).json({
        success: false,
        error: err.message,
        ...(err.validationErrors && { validationErrors: err.validationErrors }),
        ...(err.code && { code: err.code })
      })
    })

    const response = await request(app).post('/users').send({})

    expect(response.status).toBe(400)
    expect(response.body.error).toBe('Validation failed')
    expect(response.body.validationErrors).toEqual({
      email: ['Please enter a valid email'],
      password: ['Password must be at least 8 characters']
    })
  })

  it('Using business error code', async () => {
    app.post('/orders', (_req: Request, _res: Response, next: NextFunction) => {
      const error = new Error('Out of stock') as any
      error.statusCode = 400
      error.code = 'OUT_OF_STOCK'
      next(error)
    })

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const statusCode = err.statusCode || 500

      res.status(statusCode).json({
        success: false,
        error: err.message,
        ...(err.code && { code: err.code })
      })
    })

    const response = await request(app).post('/orders').send({})

    expect(response.status).toBe(400)
    expect(response.body.error).toBe('Out of stock')
    expect(response.body.code).toBe('OUT_OF_STOCK')
  })
})

describe('Document Scenario: Feature onError Handler', () => {
  let app: Express

  beforeEach(() => {
    app = express()
    app.use(express.json())
  })

  it('onError handler accessing ctx for transaction rollback', async () => {
    const rollbackMock = jest.fn()

    app.post('/orders', async (_req: any, res: any) => {
      const ctx: any = { transaction: { rollback: rollbackMock } }

      try {
        // Error occurs in Step
        const error = new Error('Order processing failed') as any
        error.statusCode = 500
        throw error
      } catch (error: any) {
        // Execute onError handler
        if (ctx.transaction) {
          await ctx.transaction.rollback()
        }

        res.status(error.statusCode || 500).json({
          success: false,
          error: error.message
        })
      }
    })

    const response = await request(app).post('/orders').send({})

    expect(response.status).toBe(500)
    expect(response.body.success).toBe(false)
    expect(rollbackMock).toHaveBeenCalled()
  })

  it('Delegating to global handler with throw from onError', async () => {
    const rollbackMock = jest.fn()
    const globalHandlerMock = jest.fn()

    app.post('/orders', async (_req: any, _res: any, next: any) => {
      const ctx: any = { transaction: { rollback: rollbackMock } }

      try {
        const error = new Error('Delegated error') as any
        error.statusCode = 400
        throw error
      } catch (error: any) {
        // onError: Only perform transaction rollback
        if (ctx.transaction) {
          await ctx.transaction.rollback()
        }

        // Delegate to global handler (re-throw error)
        next(error)
      }
    })

    // Global error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      globalHandlerMock(err.message)
      const statusCode = err.statusCode || 500
      res.status(statusCode).json({
        success: false,
        error: err.message
      })
    })

    const response = await request(app).post('/orders').send({})

    expect(rollbackMock).toHaveBeenCalled()
    expect(globalHandlerMock).toHaveBeenCalledWith('Delegated error')
    expect(response.status).toBe(400)
  })
})

describe('Document Scenario: Retry Feature', () => {
  let app: Express

  beforeEach(() => {
    app = express()
    app.use(express.json())
  })

  it('Feature retry with retry() return', async () => {
    let attemptCount = 0
    let lastProvider = ''

    app.post('/chat', async (_req: any, res: any) => {
      const ctx: any = {
        provider: 'openai',
        retryCount: 0
      }

      const providers = ['openai', 'anthropic', 'gemini']
      const MAX_RETRIES = 3

      while (ctx.retryCount <= MAX_RETRIES) {
        try {
          attemptCount++
          lastProvider = ctx.provider

          // First 2 times rate_limit error, 3rd time success
          if (attemptCount < 3) {
            throw new Error('rate_limit exceeded')
          }

          // Success
          res.json({
            result: `Success with ${ctx.provider}`,
            provider: ctx.provider
          })
          return
        } catch (error: any) {
          // onError logic
          if (error.message.includes('rate_limit')) {
            const currentIndex = providers.indexOf(ctx.provider)

            if (currentIndex < providers.length - 1) {
              ctx.provider = providers[currentIndex + 1]
              ctx.retryCount++
              // retry({ delay: 10 }) simulation
              await new Promise(resolve => setTimeout(resolve, 10))
              continue
            }
          }

          res.status(500).json({ error: error.message })
          return
        }
      }

      res.status(503).json({ error: 'Max retry attempts exceeded' })
    })

    const response = await request(app).post('/chat').send({})

    expect(response.status).toBe(200)
    expect(attemptCount).toBe(3)
    expect(lastProvider).toBe('gemini')
    expect(response.body.provider).toBe('gemini')
  })

  it('Error when max retry count exceeded', async () => {
    let attemptCount = 0

    app.post('/api', async (_req: any, res: any) => {
      const ctx: any = { retryCount: 0 }
      const MAX_RETRIES = 3

      while (ctx.retryCount <= MAX_RETRIES) {
        try {
          attemptCount++
          throw new Error('Connection timeout')
        } catch (error: any) {
          if (error.message.includes('timeout')) {
            ctx.retryCount++

            if (ctx.retryCount <= MAX_RETRIES) {
              await new Promise(resolve => setTimeout(resolve, 10))
              continue
            }
          }

          res.status(500).json({
            error: error.message,
            attempts: attemptCount
          })
          return
        }
      }
    })

    const response = await request(app).post('/api').send({})

    expect(response.status).toBe(500)
    expect(attemptCount).toBe(4) // Original 1 time + 3 retries
  })
})

describe('Document Scenario: FeatureError and Step Debugging', () => {
  let app: Express

  beforeEach(() => {
    app = express()
    app.use(express.json())
  })

  it('Accessing FeatureError step information', async () => {
    let capturedStep: any = null

    app.post('/orders', (_req: Request, _res: Response, next: NextFunction) => {
      // Wrapped as FeatureError when error occurs in Step
      const stepInfo = { number: 200, name: '200-process.js', path: '/path', fn: async () => {} }
      const originalError = new Error('Out of stock')
      const featureError = new FeatureError(
        originalError.message,
        originalError,
        stepInfo,
        {},
        400
      )
      next(featureError)
    })

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      // Access Step information
      if (err.step) {
        capturedStep = err.step
      }

      res.status(err.statusCode || 500).json({
        success: false,
        error: err.message,
        ...(err.step && { step: { number: err.step.number, name: err.step.name } })
      })
    })

    const response = await request(app).post('/orders').send({})

    expect(capturedStep).not.toBeNull()
    expect(capturedStep.number).toBe(200)
    expect(capturedStep.name).toBe('200-process.js')

    expect(response.body.step).toEqual({
      number: 200,
      name: '200-process.js'
    })
  })

  it('Accessing FeatureError originalError', async () => {
    app.post('/users', (_req: Request, _res: Response, next: NextFunction) => {
      // Add custom properties to original error
      const originalError = new Error('Validation failed') as any
      originalError.statusCode = 400
      originalError.code = 'VALIDATION_ERROR'
      originalError.validationErrors = { email: ['Invalid email format'] }

      // Wrap as FeatureError
      const stepInfo = { number: 100, name: '100-validate.js', path: '/path', fn: async () => {} }
      const featureError = new FeatureError(
        originalError.message,
        originalError,
        stepInfo,
        {},
        originalError.statusCode
      )
      next(featureError)
    })

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      // Access original error's additional properties
      const originalError = err.originalError || err

      const response: any = {
        success: false,
        error: originalError.message,
        statusCode: originalError.statusCode || 500
      }

      // Include original error's custom properties
      if (originalError.validationErrors) {
        response.validationErrors = originalError.validationErrors
      }
      if (originalError.code) {
        response.code = originalError.code
      }

      res.status(response.statusCode).json(response)
    })

    const response = await request(app).post('/users').send({})

    expect(response.status).toBe(400)
    expect(response.body.error).toBe('Validation failed')
    expect(response.body.code).toBe('VALIDATION_ERROR')
    expect(response.body.validationErrors).toEqual({ email: ['Invalid email format'] })
  })
})

describe('Document Scenario: Custom Error Classes', () => {
  let app: Express

  beforeEach(() => {
    app = express()
    app.use(express.json())
  })

  // Custom error class definition (documentation example)
  class PaymentError extends Error {
    statusCode = 402
    transactionId: string
    reason: string
    refundable: boolean

    constructor(
      message: string,
      { transactionId, reason, refundable = false }: { transactionId: string; reason: string; refundable?: boolean }
    ) {
      super(message)
      this.name = 'PaymentError'
      this.transactionId = transactionId
      this.reason = reason
      this.refundable = refundable
    }
  }

  class ValidationError extends Error {
    statusCode = 400
    validationErrors: Record<string, string[]>

    constructor(message: string, errors: Record<string, string[]> = {}) {
      super(message)
      this.name = 'ValidationError'
      this.validationErrors = errors
    }
  }

  class ExternalAPIError extends Error {
    statusCode = 502
    provider: string
    originalStatus: number
    retryable: boolean

    constructor(
      message: string,
      { provider, originalStatus, retryable = false }: { provider: string; originalStatus: number; retryable?: boolean }
    ) {
      super(message)
      this.name = 'ExternalAPIError'
      this.provider = provider
      this.originalStatus = originalStatus
      this.retryable = retryable
    }
  }

  it('Using PaymentError', async () => {
    app.post('/payments', (_req: Request, _res: Response, next: NextFunction) => {
      next(
        new PaymentError('Payment failed', {
          transactionId: 'tx_12345',
          reason: 'insufficient_funds',
          refundable: false
        })
      )
    })

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const statusCode = err.statusCode || 500

      const response: any = {
        success: false,
        error: {
          type: err.name,
          message: err.message
        }
      }

      if (err.transactionId) response.error.transactionId = err.transactionId
      if (err.reason) response.error.reason = err.reason

      res.status(statusCode).json(response)
    })

    const response = await request(app).post('/payments').send({})

    expect(response.status).toBe(402)
    expect(response.body.error.type).toBe('PaymentError')
    expect(response.body.error.transactionId).toBe('tx_12345')
    expect(response.body.error.reason).toBe('insufficient_funds')
  })

  it('Using ValidationError', async () => {
    app.post('/users', (_req: Request, _res: Response, next: NextFunction) => {
      next(
        new ValidationError('Validation failed', {
          email: ['Please enter a valid email'],
          password: ['Password must be at least 8 characters']
        })
      )
    })

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const statusCode = err.statusCode || 500

      const response: any = {
        success: false,
        error: {
          type: err.name,
          message: err.message
        }
      }

      if (err.validationErrors) response.error.fields = err.validationErrors

      res.status(statusCode).json(response)
    })

    const response = await request(app).post('/users').send({})

    expect(response.status).toBe(400)
    expect(response.body.error.type).toBe('ValidationError')
    expect(response.body.error.fields).toEqual({
      email: ['Please enter a valid email'],
      password: ['Password must be at least 8 characters']
    })
  })

  it('Using ExternalAPIError', async () => {
    app.post('/api/external', (_req: Request, _res: Response, next: NextFunction) => {
      next(
        new ExternalAPIError('Payment service connection failed', {
          provider: 'stripe',
          originalStatus: 503,
          retryable: true
        })
      )
    })

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const statusCode = err.statusCode || 500

      const response: any = {
        success: false,
        error: {
          type: err.name,
          message: err.message
        }
      }

      if (err.provider) response.error.provider = err.provider

      res.status(statusCode).json(response)
    })

    const response = await request(app).post('/api/external').send({})

    expect(response.status).toBe(502)
    expect(response.body.error.type).toBe('ExternalAPIError')
    expect(response.body.error.provider).toBe('stripe')
  })
})

describe('Document Scenario: Development vs Production', () => {
  let originalEnv: string | undefined

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV
  })

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
  })

  it('Include error message and stack in development environment', async () => {
    process.env.NODE_ENV = 'development'

    const app = express()
    const isProd = process.env.NODE_ENV === 'production'

    app.get('/error', (_req: Request, _res: Response, next: NextFunction) => {
      next(new Error('Test error'))
    })

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const originalError = err.originalError || err
      const statusCode = originalError.statusCode || 500

      res.status(statusCode).json({
        success: false,
        error: originalError.message,
        // Stack trace (development only)
        ...(!isProd && { stack: originalError.stack })
      })
    })

    const response = await request(app).get('/error')

    expect(response.body.error).toBe('Test error')
    expect(response.body.stack).toBeDefined()
  })

  it('Exclude stack in production environment', async () => {
    process.env.NODE_ENV = 'production'

    const app = express()
    const isProd = process.env.NODE_ENV === 'production'

    app.get('/error', (_req: Request, _res: Response, next: NextFunction) => {
      next(new Error('Sensitive error'))
    })

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const originalError = err.originalError || err
      const statusCode = originalError.statusCode || 500

      res.status(statusCode).json({
        success: false,
        error: originalError.message,
        // No stack in production
        ...(!isProd && { stack: originalError.stack })
      })
    })

    const response = await request(app).get('/error')

    expect(response.body.error).toBe('Sensitive error')
    expect(response.body.stack).toBeUndefined()
  })

  it('Exclude Step info in production', async () => {
    process.env.NODE_ENV = 'production'

    const app = express()
    const isProd = process.env.NODE_ENV === 'production'

    app.post('/orders', (_req: Request, _res: Response, next: NextFunction) => {
      const stepInfo = { number: 200, name: '200-process.js', path: '/path', fn: async () => {} }
      const originalError = new Error('Order failed')
      const featureError = new FeatureError(
        originalError.message,
        originalError,
        stepInfo,
        {},
        500
      )
      next(featureError)
    })

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const originalError = err.originalError || err
      const statusCode = originalError.statusCode || 500

      res.status(statusCode).json({
        success: false,
        error: originalError.message,
        // Step info (development only)
        ...(!isProd && err.step && { step: { number: err.step.number, name: err.step.name } }),
        // Stack trace (development only)
        ...(!isProd && { stack: originalError.stack })
      })
    })

    const response = await request(app).post('/orders').send({})

    expect(response.body.step).toBeUndefined()
    expect(response.body.stack).toBeUndefined()
  })
})

describe('Document Scenario: Error Handling Flow', () => {
  let app: Express

  beforeEach(() => {
    app = express()
    app.use(express.json())
  })

  it('Error handling flow: onError sends response -> end', async () => {
    const globalHandlerMock = jest.fn()

    app.post('/test', async (_req: any, res: any) => {
      try {
        throw new Error('Test error')
      } catch (error: any) {
        // onError: Send response directly
        res.json({ handled: 'by onError', error: error.message })
        // No throw = Not passed to global handler
      }
    })

    app.use((_err: any, _req: Request, res: Response, _next: NextFunction) => {
      globalHandlerMock()
      res.status(500).json({ handled: 'by global' })
    })

    const response = await request(app).post('/test').send({})

    expect(response.status).toBe(200)
    expect(globalHandlerMock).not.toHaveBeenCalled()
    expect(response.body.handled).toBe('by onError')
  })

  it('Error handling flow: No onError -> wrap as FeatureError -> pass to Express', async () => {
    let receivedError: any = null

    app.post('/test', (_req: Request, _res: Response, next: NextFunction) => {
      // When Feature has no onError
      // When error occurs in Step, wrapped as FeatureError and passed to Express
      const stepInfo = { number: 200, name: '200-process.js', path: '/path', fn: async () => {} }
      const originalError = new Error('Step error')
      const featureError = new FeatureError(
        originalError.message,
        originalError,
        stepInfo,
        {},
        500
      )
      next(featureError)
    })

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      receivedError = err
      res.status(500).json({
        error: err.message,
        step: err.step ? { number: err.step.number, name: err.step.name } : null
      })
    })

    const response = await request(app).post('/test').send({})

    expect(response.status).toBe(500)

    // Passed as FeatureError
    expect(receivedError).not.toBeNull()
    expect(receivedError.step).toBeDefined()
    expect(receivedError.step.number).toBe(200)
    expect(receivedError.step.name).toBe('200-process.js')
  })
})
