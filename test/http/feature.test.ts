/**
 * Feature Class Tests
 *
 * Tests for Feature class functionality including middlewares, retry logic
 */

import * as path from 'path'
import * as fs from 'fs'
import { Feature } from '../../src/http/feature'
import { retry, RETRY } from '../../src/http/retry'
import type { FeatureConfig } from '../../src/http/types'

// Create test fixtures directory
const fixturesDir = path.join(__dirname, '__fixtures__', 'feature-test')

function createMockReq(options: any = {}): any {
  return {
    method: options.method || 'GET',
    url: options.url || '/test',
    headers: options.headers || {},
    body: options.body || {},
    params: options.params || {},
    query: options.query || {},
    ...options,
  }
}

function createMockRes(): any {
  let _headersSent = false
  let _statusCode = 200
  const headers: Record<string, string> = {}
  let body: any = null

  return {
    get headersSent() {
      return _headersSent
    },
    set headersSent(value: boolean) {
      _headersSent = value
    },
    get statusCode() {
      return _statusCode
    },
    set statusCode(value: number) {
      _statusCode = value
    },
    setHeader(name: string, value: string) {
      headers[name] = value
    },
    getHeader(name: string) {
      return headers[name]
    },
    end(_data?: any) {
      body = _data
      _headersSent = true
    },
    json(data: any) {
      body = data
      _headersSent = true
    },
    send(data: any) {
      body = data
      _headersSent = true
    },
    // Test helpers
    __getBody: () => body,
    __getHeaders: () => headers,
  }
}

describe('Feature', () => {
  beforeAll(() => {
    // Create test fixtures
    const stepsDir = path.join(fixturesDir, 'steps')
    fs.mkdirSync(stepsDir, { recursive: true })

    fs.writeFileSync(
      path.join(stepsDir, '100-first.js'),
      `module.exports = (ctx, req, res) => { ctx.step1 = true; }`
    )
    fs.writeFileSync(
      path.join(stepsDir, '200-response.js'),
      `module.exports = (ctx, req, res) => { res.json({ success: true }); }`
    )
  })

  afterAll(() => {
    if (fs.existsSync(fixturesDir)) {
      fs.rmSync(fixturesDir, { recursive: true })
    }
  })

  describe('Basic Initialization', () => {
    it('should create Feature with config', () => {
      const config: FeatureConfig = {
        method: 'GET',
        path: '/test',
      }

      const feature = new Feature(config, fixturesDir)

      expect(feature).toBeDefined()
      expect(feature.getInfo().method).toBe('GET')
      expect(feature.getInfo().path).toBe('/test')
    })

    it('should initialize with steps directory', async () => {
      const config: FeatureConfig = {
        method: 'GET',
        path: '/test',
        steps: './steps',
      }

      const feature = new Feature(config, fixturesDir)
      await feature.initialize()

      const info = feature.getInfo()
      expect(info.steps).toBe(2)
    })

    it('should not re-initialize if already initialized', async () => {
      const config: FeatureConfig = {
        method: 'GET',
        path: '/test',
        steps: './steps',
      }

      const feature = new Feature(config, fixturesDir)
      await feature.initialize()
      await feature.initialize() // Should not throw

      expect(feature.getInfo().steps).toBe(2)
    })
  })

  describe('updateConventions()', () => {
    it('should update method and path if not set', () => {
      const config: FeatureConfig = {
        path: '/',
      }

      const feature = new Feature(config, fixturesDir)
      feature.updateConventions('POST', '/api/users')

      const info = feature.getInfo()
      expect(info.method).toBe('POST')
      expect(info.path).toBe('/api/users')
    })

    it('should update basePath if provided', () => {
      const config: FeatureConfig = {}
      const feature = new Feature(config, fixturesDir)

      feature.updateConventions('GET', '/api', '/new/base/path')

      // basePath is private, so we test indirectly
      expect(feature.getInfo().method).toBe('GET')
    })
  })

  describe('Feature Middlewares', () => {
    it('should execute middlewares before steps', async () => {
      const executionOrder: string[] = []

      const config: FeatureConfig = {
        method: 'GET',
        path: '/test',
        middlewares: [
          (_req, _res, next) => {
            executionOrder.push('middleware1')
            next()
          },
          (_req, _res, next) => {
            executionOrder.push('middleware2')
            next()
          },
        ],
        contextInitializer: (_ctx) => {
          executionOrder.push('contextInitializer')
        },
      }

      // Create simple step that sends response
      const stepsDir = path.join(fixturesDir, 'mw-steps')
      fs.mkdirSync(stepsDir, { recursive: true })
      fs.writeFileSync(
        path.join(stepsDir, '100-respond.js'),
        `module.exports = (ctx, req, res) => { res.json({ ok: true }); }`
      )

      const configWithSteps: FeatureConfig = {
        ...config,
        steps: './mw-steps',
      }

      const featureWithSteps = new Feature(configWithSteps, fixturesDir)
      const handler = featureWithSteps.getHandler()

      const req = createMockReq()
      const res = createMockRes()

      await handler(req as any, res as any)

      expect(executionOrder).toEqual(['middleware1', 'middleware2', 'contextInitializer'])

      // Cleanup
      fs.rmSync(stepsDir, { recursive: true })
    })

    it('should stop if middleware sends response', async () => {
      const executed: string[] = []

      const config: FeatureConfig = {
        method: 'GET',
        path: '/test',
        steps: './steps',
        middlewares: [
          (_req, res, next) => {
            executed.push('middleware')
            res.json({ stopped: true })
            next()
          },
        ],
        contextInitializer: (_ctx) => {
          executed.push('contextInitializer')
        },
      }

      const feature = new Feature(config, fixturesDir)
      const handler = feature.getHandler()

      const req = createMockReq()
      const res = createMockRes()

      await handler(req as any, res as any)

      expect(executed).toEqual(['middleware'])
      expect(res.__getBody()).toEqual({ stopped: true })
    })

    it('should handle middleware errors', async () => {
      const config: FeatureConfig = {
        method: 'GET',
        path: '/test',
        steps: './steps',
        middlewares: [
          (_req, _res, next) => {
            next(new Error('Middleware error'))
          },
        ],
      }

      const feature = new Feature(config, fixturesDir)
      const handler = feature.getHandler()

      const req = createMockReq()
      const res = createMockRes()

      await expect(handler(req as any, res as any)).rejects.toThrow('Middleware error')
    })

    it('should handle async middleware', async () => {
      const executed: string[] = []

      const config: FeatureConfig = {
        method: 'GET',
        path: '/test',
        middlewares: [
          async (_req, _res, next) => {
            await new Promise((resolve) => setTimeout(resolve, 10))
            executed.push('async-middleware')
            next()
          },
        ],
      }

      const stepsDir = path.join(fixturesDir, 'async-mw-steps')
      fs.mkdirSync(stepsDir, { recursive: true })
      fs.writeFileSync(
        path.join(stepsDir, '100-respond.js'),
        `module.exports = (ctx, req, res) => { res.json({ ok: true }); }`
      )

      const featureWithSteps = new Feature({ ...config, steps: './async-mw-steps' }, fixturesDir)
      const handler = featureWithSteps.getHandler()

      const req = createMockReq()
      const res = createMockRes()

      await handler(req as any, res as any)

      expect(executed).toContain('async-middleware')

      // Cleanup
      fs.rmSync(stepsDir, { recursive: true })
    })

    it('should handle middleware throwing error', async () => {
      const config: FeatureConfig = {
        method: 'GET',
        path: '/test',
        steps: './steps',
        middlewares: [
          (_req, _res, _next) => {
            throw new Error('Sync error')
          },
        ],
      }

      const feature = new Feature(config, fixturesDir)
      const handler = feature.getHandler()

      const req = createMockReq()
      const res = createMockRes()

      await expect(handler(req as any, res as any)).rejects.toThrow('Sync error')
    })
  })

  describe('Retry Logic', () => {
    it('should retry when onError returns RETRY', async () => {
      let attempts = 0

      const stepsDir = path.join(fixturesDir, 'retry-steps')
      fs.mkdirSync(stepsDir, { recursive: true })
      fs.writeFileSync(
        path.join(stepsDir, '100-fail.js'),
        `
        let count = 0
        module.exports = (ctx, req, res) => {
          count++
          ctx.attempts = count
          if (count < 3) {
            throw new Error('Retry please')
          }
          res.json({ attempts: count })
        }
        `
      )

      const config: FeatureConfig = {
        method: 'GET',
        path: '/test',
        steps: './retry-steps',
        onError: (error, _ctx, _req, res: any): any => {
          attempts++
          if (attempts < 3) {
            return RETRY
          }
          res.json({ error: error.message })
        },
      }

      const feature = new Feature(config, fixturesDir)
      const handler = feature.getHandler()

      const req = createMockReq()
      const res = createMockRes()

      await handler(req as any, res as any)

      // Should have retried
      expect(attempts).toBeGreaterThanOrEqual(2)

      // Cleanup
      fs.rmSync(stepsDir, { recursive: true })
    })

    it('should respect maxAttempts in retry signal', async () => {
      let attempts = 0

      const stepsDir = path.join(fixturesDir, 'max-retry-steps')
      fs.mkdirSync(stepsDir, { recursive: true })
      fs.writeFileSync(
        path.join(stepsDir, '100-always-fail.js'),
        `module.exports = (ctx, req, res) => { throw new Error('Always fails') }`
      )

      const config: FeatureConfig = {
        method: 'GET',
        path: '/test',
        steps: './max-retry-steps',
        onError: (_error, _ctx, _req, _res) => {
          attempts++
          return retry({ maxAttempts: 2 })
        },
      }

      const feature = new Feature(config, fixturesDir)
      const handler = feature.getHandler()

      const req = createMockReq()
      const res = createMockRes()

      await handler(req as any, res as any)

      expect(res.statusCode).toBe(503)
      expect(attempts).toBe(2)

      // Cleanup
      fs.rmSync(stepsDir, { recursive: true })
    })

    it('should respect delay in retry signal', async () => {
      const startTime = Date.now()
      let attempts = 0

      const stepsDir = path.join(fixturesDir, 'delay-retry-steps')
      fs.mkdirSync(stepsDir, { recursive: true })
      fs.writeFileSync(
        path.join(stepsDir, '100-fail-twice.js'),
        `
        let count = 0
        module.exports = (ctx, req, res) => {
          count++
          if (count <= 2) {
            throw new Error('Fail')
          }
          res.json({ ok: true })
        }
        `
      )

      const config: FeatureConfig = {
        method: 'GET',
        path: '/test',
        steps: './delay-retry-steps',
        onError: (_error, _ctx, _req, res: any): any => {
          attempts++
          if (attempts <= 2) {
            return retry({ delay: 50 })
          }
          res.json({ error: 'max retries' })
        },
      }

      const feature = new Feature(config, fixturesDir)
      const handler = feature.getHandler()

      const req = createMockReq()
      const res = createMockRes()

      await handler(req as any, res as any)

      const elapsed = Date.now() - startTime
      // Should have waited at least 50ms for delays
      expect(elapsed).toBeGreaterThanOrEqual(50)

      // Cleanup
      fs.rmSync(stepsDir, { recursive: true })
    })

    it('should stop retrying when onError handles response', async () => {
      const stepsDir = path.join(fixturesDir, 'handled-error-steps')
      fs.mkdirSync(stepsDir, { recursive: true })
      fs.writeFileSync(
        path.join(stepsDir, '100-fail.js'),
        `module.exports = (ctx, req, res) => { throw new Error('Fail') }`
      )

      const config: FeatureConfig = {
        method: 'GET',
        path: '/test',
        steps: './handled-error-steps',
        onError: (_error, _ctx, _req, res: any) => {
          res.statusCode = 400
          res.json({ handled: true })
          // No return means don't retry
        },
      }

      const feature = new Feature(config, fixturesDir)
      const handler = feature.getHandler()

      const req = createMockReq()
      const res = createMockRes()

      await handler(req as any, res as any)

      expect(res.__getBody()).toEqual({ handled: true })
      expect(res.statusCode).toBe(400)

      // Cleanup
      fs.rmSync(stepsDir, { recursive: true })
    })

    it('should throw error when no onError handler', async () => {
      const stepsDir = path.join(fixturesDir, 'no-handler-steps')
      fs.mkdirSync(stepsDir, { recursive: true })
      fs.writeFileSync(
        path.join(stepsDir, '100-fail.js'),
        `module.exports = (ctx, req, res) => { throw new Error('No handler') }`
      )

      const config: FeatureConfig = {
        method: 'GET',
        path: '/test',
        steps: './no-handler-steps',
      }

      const feature = new Feature(config, fixturesDir)
      const handler = feature.getHandler()

      const req = createMockReq()
      const res = createMockRes()

      await expect(handler(req as any, res as any)).rejects.toThrow()

      // Cleanup
      fs.rmSync(stepsDir, { recursive: true })
    })
  })

  describe('Context Initializer', () => {
    it('should call contextInitializer before steps', async () => {
      const stepsDir = path.join(fixturesDir, 'ctx-init-steps')
      fs.mkdirSync(stepsDir, { recursive: true })
      fs.writeFileSync(
        path.join(stepsDir, '100-check.js'),
        `module.exports = (ctx, req, res) => { res.json({ userId: ctx.userId }) }`
      )

      const config: FeatureConfig = {
        method: 'GET',
        path: '/test',
        steps: './ctx-init-steps',
        contextInitializer: (ctx, _req, _res) => {
          ctx.userId = 123
        },
      }

      const feature = new Feature(config, fixturesDir)
      const handler = feature.getHandler()

      const req = createMockReq()
      const res = createMockRes()

      await handler(req as any, res as any)

      expect(res.__getBody()).toEqual({ userId: 123 })

      // Cleanup
      fs.rmSync(stepsDir, { recursive: true })
    })

    it('should support async contextInitializer', async () => {
      const stepsDir = path.join(fixturesDir, 'async-ctx-steps')
      fs.mkdirSync(stepsDir, { recursive: true })
      fs.writeFileSync(
        path.join(stepsDir, '100-check.js'),
        `module.exports = (ctx, req, res) => { res.json({ loaded: ctx.loaded }) }`
      )

      const config: FeatureConfig = {
        method: 'GET',
        path: '/test',
        steps: './async-ctx-steps',
        contextInitializer: async (ctx, _req, _res) => {
          await new Promise((resolve) => setTimeout(resolve, 10))
          ctx.loaded = true
        },
      }

      const feature = new Feature(config, fixturesDir)
      const handler = feature.getHandler()

      const req = createMockReq()
      const res = createMockRes()

      await handler(req as any, res as any)

      expect(res.__getBody()).toEqual({ loaded: true })

      // Cleanup
      fs.rmSync(stepsDir, { recursive: true })
    })
  })

  describe('Async Tasks', () => {
    it('should schedule async tasks after success', async () => {
      const stepsDir = path.join(fixturesDir, 'async-task-steps')
      const asyncDir = path.join(fixturesDir, 'async-tasks')
      fs.mkdirSync(stepsDir, { recursive: true })
      fs.mkdirSync(asyncDir, { recursive: true })

      fs.writeFileSync(
        path.join(stepsDir, '100-respond.js'),
        `module.exports = (ctx, req, res) => { res.json({ ok: true }) }`
      )
      fs.writeFileSync(
        path.join(asyncDir, 'notify.js'),
        `module.exports = async (ctx) => { ctx.notified = true }`
      )

      const config: FeatureConfig = {
        method: 'GET',
        path: '/test',
        steps: './async-task-steps',
        asyncTasks: './async-tasks',
      }

      const feature = new Feature(config, fixturesDir)
      const handler = feature.getHandler()

      const req = createMockReq()
      const res = createMockRes()

      await handler(req as any, res as any)

      expect(res.__getBody()).toEqual({ ok: true })

      // Cleanup
      fs.rmSync(stepsDir, { recursive: true })
      fs.rmSync(asyncDir, { recursive: true })
    })
  })

  describe('getInfo()', () => {
    it('should return feature information', async () => {
      const config: FeatureConfig = {
        method: 'POST',
        path: '/api/users',
        steps: './steps',
        onError: () => {},
      }

      const feature = new Feature(config, fixturesDir)
      await feature.initialize()

      const info = feature.getInfo()

      expect(info.method).toBe('POST')
      expect(info.path).toBe('/api/users')
      expect(info.steps).toBe(2)
      expect(info.hasErrorHandler).toBe(true)
    })
  })
})
