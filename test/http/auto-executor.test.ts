/**
 * AutoExecutor Tests
 *
 * Tests for the Auto-Execution Engine
 */

import { AutoExecutor } from '../../src/http/auto-executor'
import { FeatureError } from '../../src/http/types'
import type { StepInfo, Context } from '../../src/http/types'

// Mock request and response
function createMockReq(options: any = {}): any {
  return {
    method: options.method || 'GET',
    url: options.url || '/test',
    ...options,
  }
}

function createMockRes(): any {
  let _headersSent = false
  const headers: Record<string, string> = {}

  return {
    get headersSent() {
      return _headersSent
    },
    set headersSent(value: boolean) {
      _headersSent = value
    },
    statusCode: 200,
    setHeader(name: string, value: string) {
      headers[name] = value
    },
    getHeader(name: string) {
      return headers[name]
    },
    end(_data?: any) {
      _headersSent = true
    },
    json(_data: any) {
      _headersSent = true
    },
    send(_data: any) {
      _headersSent = true
    },
  }
}

function createStep(number: number, fn: any, name?: string): StepInfo {
  return {
    number,
    name: name || `${number}-step.js`,
    fn,
    path: `/test/steps/${number}-step.js`,
  }
}

describe('AutoExecutor', () => {
  describe('Basic Execution', () => {
    it('should execute all steps in order', async () => {
      const order: number[] = []
      const steps = [
        createStep(100, async (ctx: Context) => {
          order.push(1)
          ctx.step1 = true
        }),
        createStep(200, async (ctx: Context) => {
          order.push(2)
          ctx.step2 = true
        }),
        createStep(300, async (_ctx: Context, _req: any, res: any) => {
          order.push(3)
          res.json({ success: true })
        }),
      ]

      const context: Context = {}
      const req = createMockReq()
      const res = createMockRes()

      const executor = new AutoExecutor({ steps, context, req, res })
      const result = await executor.execute()

      expect(order).toEqual([1, 2, 3])
      expect(result.step1).toBe(true)
      expect(result.step2).toBe(true)
    })

    it('should throw error if no steps provided', async () => {
      const context: Context = {}
      const req = createMockReq()
      const res = createMockRes()

      const executor = new AutoExecutor({ steps: [], context, req, res })

      await expect(executor.execute()).rejects.toThrow('No steps to execute')
    })

    it('should share context between steps', async () => {
      const steps = [
        createStep(100, async (ctx: Context) => {
          ctx.value = 10
        }),
        createStep(200, async (ctx: Context) => {
          ctx.value = ctx.value * 2
        }),
        createStep(300, async (ctx: Context, _req: any, res: any) => {
          ctx.value = ctx.value + 5
          res.json({ value: ctx.value })
        }),
      ]

      const context: Context = {}
      const req = createMockReq()
      const res = createMockRes()

      const executor = new AutoExecutor({ steps, context, req, res })
      const result = await executor.execute()

      expect(result.value).toBe(25) // 10 * 2 + 5
    })
  })

  describe('Early Response', () => {
    it('should stop execution when response is sent early', async () => {
      const executed: number[] = []
      const steps = [
        createStep(100, async (_ctx: Context, _req: any, res: any) => {
          executed.push(100)
          res.json({ early: true })
        }),
        createStep(200, async (_ctx: Context) => {
          executed.push(200)
        }),
      ]

      const context: Context = {}
      const req = createMockReq()
      const res = createMockRes()

      const executor = new AutoExecutor({ steps, context, req, res })
      await executor.execute()

      expect(executed).toEqual([100])
    })
  })

  describe('Error Handling', () => {
    it('should wrap error in FeatureError', async () => {
      const steps = [
        createStep(100, async () => {
          throw new Error('Step failed')
        }),
      ]

      const context: Context = {}
      const req = createMockReq()
      const res = createMockRes()

      const executor = new AutoExecutor({ steps, context, req, res })

      try {
        await executor.execute()
        fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(FeatureError)
        expect((error as FeatureError).message).toBe('Step failed')
        expect((error as FeatureError).step?.number).toBe(100)
      }
    })

    it('should preserve statusCode from original error', async () => {
      const steps = [
        createStep(100, async () => {
          const error = new Error('Not found') as any
          error.statusCode = 404
          throw error
        }),
      ]

      const context: Context = {}
      const req = createMockReq()
      const res = createMockRes()

      const executor = new AutoExecutor({ steps, context, req, res })

      try {
        await executor.execute()
        fail('Should have thrown')
      } catch (error) {
        expect((error as FeatureError).statusCode).toBe(404)
      }
    })

    it('should re-throw existing FeatureError without wrapping', async () => {
      const originalError = new FeatureError('Original', undefined, undefined, {}, 400)

      const steps = [
        createStep(100, async () => {
          throw originalError
        }),
      ]

      const context: Context = {}
      const req = createMockReq()
      const res = createMockRes()

      const executor = new AutoExecutor({ steps, context, req, res })

      try {
        await executor.execute()
        fail('Should have thrown')
      } catch (error) {
        expect(error).toBe(originalError)
      }
    })

    it('should include context in FeatureError', async () => {
      const steps = [
        createStep(100, async (ctx: Context) => {
          ctx.userId = 123
        }),
        createStep(200, async () => {
          throw new Error('Failed after context set')
        }),
      ]

      const context: Context = {}
      const req = createMockReq()
      const res = createMockRes()

      const executor = new AutoExecutor({ steps, context, req, res })

      try {
        await executor.execute()
        fail('Should have thrown')
      } catch (error) {
        expect((error as FeatureError).context?.userId).toBe(123)
      }
    })
  })

  describe('Response Validation', () => {
    it('should throw error if no response sent after all steps', async () => {
      const steps = [
        createStep(100, async (ctx: Context) => {
          ctx.data = 'test'
        }),
      ]

      const context: Context = {}
      const req = createMockReq()
      const res = createMockRes()

      const executor = new AutoExecutor({ steps, context, req, res })

      await expect(executor.execute()).rejects.toThrow('Feature completed without sending a response')
    })
  })

  describe('Synchronous Steps', () => {
    it('should support synchronous step functions', async () => {
      const steps = [
        createStep(100, (ctx: Context) => {
          ctx.sync = true
        }),
        createStep(200, (ctx: Context, _req: any, res: any) => {
          res.json({ sync: ctx.sync })
        }),
      ]

      const context: Context = {}
      const req = createMockReq()
      const res = createMockRes()

      const executor = new AutoExecutor({ steps, context, req, res })
      const result = await executor.execute()

      expect(result.sync).toBe(true)
    })
  })

  describe('Async Response Tracking', () => {
    it('should wait for async response methods', async () => {
      let renderComplete = false

      const steps = [
        createStep(100, async (_ctx: Context, _req: any, res: any) => {
          // Simulate async render
          await new Promise((resolve) => {
            setTimeout(() => {
              renderComplete = true
              res.end('rendered')
              resolve(undefined)
            }, 10)
          })
        }),
      ]

      const context: Context = {}
      const req = createMockReq()
      const res = createMockRes()

      const executor = new AutoExecutor({ steps, context, req, res })
      await executor.execute()

      expect(renderComplete).toBe(true)
    })
  })
})

describe('AutoExecutor Debug Mode', () => {
  const originalEnv = process.env.NODE_ENV

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
  })

  it('should not log in test environment', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

    const steps = [
      createStep(100, async (_ctx: Context, _req: any, res: any) => {
        res.json({ test: true })
      }),
    ]

    const context: Context = {}
    const req = createMockReq()
    const res = createMockRes()

    const executor = new AutoExecutor({ steps, context, req, res })
    await executor.execute()

    // In test environment, logs should not be called
    expect(consoleSpy).not.toHaveBeenCalled()

    consoleSpy.mockRestore()
  })
})
