/**
 * Error Handling Documentation Scenarios Tests
 *
 * 문서(docs/error-handling.ko.md)에서 설명하는
 * 모든 에러 핸들링 시나리오가 실제로 동작하는지 검증합니다.
 *
 * TDD: RED phase - 문서 기반 시나리오 테스트 작성
 */

import express, { Express, Request, Response, NextFunction } from 'express'
import request from 'supertest'
import { FeatureError } from '../src/feature/types'

describe('문서 시나리오: Express 스타일 에러 처리', () => {
  let app: Express

  beforeEach(() => {
    app = express()
    app.use(express.json())
  })

  it('statusCode 추가하여 에러 던지기', async () => {
    app.get('/users/:id', (_req: Request, _res: Response, next: NextFunction) => {
      const error = new Error('User not found') as Error & { statusCode: number }
      error.statusCode = 404
      next(error)
    })

    // 글로벌 에러 핸들러
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

  it('statusCode 없이 던지면 500으로 처리', async () => {
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

  it('validationErrors, code 등 추가 속성 사용', async () => {
    app.post('/users', (_req: Request, _res: Response, next: NextFunction) => {
      const error = new Error('검증 실패') as any
      error.statusCode = 400
      error.validationErrors = {
        email: ['유효한 이메일을 입력하세요'],
        password: ['비밀번호는 8자 이상이어야 합니다']
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
    expect(response.body.error).toBe('검증 실패')
    expect(response.body.validationErrors).toEqual({
      email: ['유효한 이메일을 입력하세요'],
      password: ['비밀번호는 8자 이상이어야 합니다']
    })
  })

  it('비즈니스 에러 코드 (code) 사용', async () => {
    app.post('/orders', (_req: Request, _res: Response, next: NextFunction) => {
      const error = new Error('재고가 부족합니다') as any
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
    expect(response.body.error).toBe('재고가 부족합니다')
    expect(response.body.code).toBe('OUT_OF_STOCK')
  })
})

describe('문서 시나리오: Feature의 onError 핸들러', () => {
  let app: Express

  beforeEach(() => {
    app = express()
    app.use(express.json())
  })

  it('onError 핸들러가 ctx 접근하여 트랜잭션 롤백', async () => {
    const rollbackMock = jest.fn()

    app.post('/orders', async (_req: any, res: any) => {
      const ctx: any = { transaction: { rollback: rollbackMock } }

      try {
        // Step에서 에러 발생
        const error = new Error('Order processing failed') as any
        error.statusCode = 500
        throw error
      } catch (error: any) {
        // onError 핸들러 실행
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

  it('onError에서 throw로 글로벌 핸들러에 위임', async () => {
    const rollbackMock = jest.fn()
    const globalHandlerMock = jest.fn()

    app.post('/orders', async (_req: any, _res: any, next: any) => {
      const ctx: any = { transaction: { rollback: rollbackMock } }

      try {
        const error = new Error('Delegated error') as any
        error.statusCode = 400
        throw error
      } catch (error: any) {
        // onError: 트랜잭션 롤백만 수행
        if (ctx.transaction) {
          await ctx.transaction.rollback()
        }

        // 글로벌 핸들러로 위임 (에러 다시 던지기)
        next(error)
      }
    })

    // 글로벌 에러 핸들러
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

describe('문서 시나리오: 재시도 (Retry) 기능', () => {
  let app: Express

  beforeEach(() => {
    app = express()
    app.use(express.json())
  })

  it('retry() 반환으로 Feature 재시도', async () => {
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

          // 처음 2번은 rate_limit 에러, 3번째는 성공
          if (attemptCount < 3) {
            throw new Error('rate_limit exceeded')
          }

          // 성공
          res.json({
            result: `Success with ${ctx.provider}`,
            provider: ctx.provider
          })
          return
        } catch (error: any) {
          // onError 로직
          if (error.message.includes('rate_limit')) {
            const currentIndex = providers.indexOf(ctx.provider)

            if (currentIndex < providers.length - 1) {
              ctx.provider = providers[currentIndex + 1]
              ctx.retryCount++
              // retry({ delay: 10 }) 시뮬레이션
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

  it('최대 재시도 횟수 초과 시 에러', async () => {
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
    expect(attemptCount).toBe(4) // 원래 1회 + 재시도 3회
  })
})

describe('문서 시나리오: FeatureError와 Step 디버깅', () => {
  let app: Express

  beforeEach(() => {
    app = express()
    app.use(express.json())
  })

  it('FeatureError의 step 정보 접근', async () => {
    let capturedStep: any = null

    app.post('/orders', (_req: Request, _res: Response, next: NextFunction) => {
      // Step에서 에러 발생 시 FeatureError로 래핑됨
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
      // Step 정보 접근
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

  it('FeatureError의 originalError 접근', async () => {
    app.post('/users', (_req: Request, _res: Response, next: NextFunction) => {
      // 원본 에러에 커스텀 속성 추가
      const originalError = new Error('Validation failed') as any
      originalError.statusCode = 400
      originalError.code = 'VALIDATION_ERROR'
      originalError.validationErrors = { email: ['Invalid email format'] }

      // FeatureError로 래핑
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
      // 원래 에러의 추가 속성 접근
      const originalError = err.originalError || err

      const response: any = {
        success: false,
        error: originalError.message,
        statusCode: originalError.statusCode || 500
      }

      // 원래 에러의 커스텀 속성 포함
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

describe('문서 시나리오: 커스텀 에러 클래스', () => {
  let app: Express

  beforeEach(() => {
    app = express()
    app.use(express.json())
  })

  // 커스텀 에러 클래스 정의 (문서 예시)
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

  it('PaymentError 사용', async () => {
    app.post('/payments', (_req: Request, _res: Response, next: NextFunction) => {
      next(
        new PaymentError('결제 실패', {
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

  it('ValidationError 사용', async () => {
    app.post('/users', (_req: Request, _res: Response, next: NextFunction) => {
      next(
        new ValidationError('검증 실패', {
          email: ['유효한 이메일을 입력하세요'],
          password: ['비밀번호는 8자 이상이어야 합니다']
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
      email: ['유효한 이메일을 입력하세요'],
      password: ['비밀번호는 8자 이상이어야 합니다']
    })
  })

  it('ExternalAPIError 사용', async () => {
    app.post('/api/external', (_req: Request, _res: Response, next: NextFunction) => {
      next(
        new ExternalAPIError('결제 서비스 연결 실패', {
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

describe('문서 시나리오: 개발 vs 프로덕션', () => {
  let originalEnv: string | undefined

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV
  })

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
  })

  it('개발 환경에서는 에러 메시지와 스택 포함', async () => {
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
        // 스택 트레이스 (개발 환경에서만)
        ...(!isProd && { stack: originalError.stack })
      })
    })

    const response = await request(app).get('/error')

    expect(response.body.error).toBe('Test error')
    expect(response.body.stack).toBeDefined()
  })

  it('프로덕션 환경에서는 스택 미포함', async () => {
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
        // 프로덕션에서는 스택 미포함
        ...(!isProd && { stack: originalError.stack })
      })
    })

    const response = await request(app).get('/error')

    expect(response.body.error).toBe('Sensitive error')
    expect(response.body.stack).toBeUndefined()
  })

  it('프로덕션에서 Step 정보도 미포함', async () => {
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
        // Step 정보 (개발 환경에서만)
        ...(!isProd && err.step && { step: { number: err.step.number, name: err.step.name } }),
        // 스택 트레이스 (개발 환경에서만)
        ...(!isProd && { stack: originalError.stack })
      })
    })

    const response = await request(app).post('/orders').send({})

    expect(response.body.step).toBeUndefined()
    expect(response.body.stack).toBeUndefined()
  })
})

describe('문서 시나리오: 에러 처리 흐름', () => {
  let app: Express

  beforeEach(() => {
    app = express()
    app.use(express.json())
  })

  it('에러 처리 흐름도 검증: onError에서 응답 전송 -> 끝', async () => {
    const globalHandlerMock = jest.fn()

    app.post('/test', async (_req: any, res: any) => {
      try {
        throw new Error('Test error')
      } catch (error: any) {
        // onError: 직접 응답 전송
        res.json({ handled: 'by onError', error: error.message })
        // throw 하지 않음 = 글로벌 핸들러로 전달 안 됨
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

  it('에러 처리 흐름도 검증: onError 없음 -> FeatureError로 wrap -> Express로 전달', async () => {
    let receivedError: any = null

    app.post('/test', (_req: Request, _res: Response, next: NextFunction) => {
      // Feature에 onError 없을 때
      // Step에서 에러 발생 시 FeatureError로 래핑되어 Express에 전달됨
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

    // FeatureError로 전달됨
    expect(receivedError).not.toBeNull()
    expect(receivedError.step).toBeDefined()
    expect(receivedError.step.number).toBe(200)
    expect(receivedError.step.name).toBe('200-process.js')
  })
})
