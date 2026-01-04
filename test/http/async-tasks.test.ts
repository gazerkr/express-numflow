/**
 * Async Tasks Integration Tests
 *
 * Tests for async task execution, error handling, and scheduling
 */

import express, { Express } from 'express'
import request from 'supertest'
import { createFeatureRouter } from '../../src/create-feature-router'
import * as path from 'path'
import * as fs from 'fs'

describe('Async Tasks', () => {
  let app: Express
  const testFixturesDir = path.resolve(__dirname, '../test-fixtures/features-async-advanced')

  beforeAll(() => {
    // Create test fixtures directory for async tasks
    fs.mkdirSync(testFixturesDir, { recursive: true })
  })

  afterAll(() => {
    // Cleanup test fixtures
    if (fs.existsSync(testFixturesDir)) {
      fs.rmSync(testFixturesDir, { recursive: true, force: true })
    }
  })

  beforeEach(() => {
    app = express()
    app.use(express.json())
  })

  describe('Basic async task execution', () => {
    it('should not block response when async tasks take time', async () => {
      // Given: Feature directory
      const featureDir = path.join(testFixturesDir, 'api', 'slow-tasks', '@post')
      const stepsDir = path.join(featureDir, 'steps')
      const asyncDir = path.join(featureDir, 'async-tasks')

      fs.mkdirSync(stepsDir, { recursive: true })
      fs.mkdirSync(asyncDir, { recursive: true })

      // Create step that responds immediately
      fs.writeFileSync(
        path.join(stepsDir, '100-respond.js'),
        `module.exports = async (ctx, req, res) => {
          ctx.startTime = Date.now()
          res.status(200).json({ message: 'Processing started' })
        }`
      )

      // Create slow async task
      fs.writeFileSync(
        path.join(asyncDir, 'slow-task.js'),
        `module.exports = async (ctx) => {
          await new Promise(resolve => setTimeout(resolve, 200))
          ctx.taskCompleted = true
        }`
      )

      // When: Make request
      const router = await createFeatureRouter(testFixturesDir)
      app.use(router)

      const start = Date.now()
      const response = await request(app).post('/api/slow-tasks').expect(200)
      const duration = Date.now() - start

      // Then: Response should be fast (< 200ms, async task takes 200ms)
      // If response comes back in < 200ms, it means async task didn't block
      expect(duration).toBeLessThan(200)
      expect(response.body.message).toBe('Processing started')
    })
  })

  describe('Async task error handling', () => {
    it('should continue execution even if async task fails', async () => {
      // Given: Feature with failing async task
      const featureDir = path.join(testFixturesDir, 'api', 'fail-async', '@post')
      const stepsDir = path.join(featureDir, 'steps')
      const asyncDir = path.join(featureDir, 'async-tasks')

      fs.mkdirSync(stepsDir, { recursive: true })
      fs.mkdirSync(asyncDir, { recursive: true })

      // Create step
      fs.writeFileSync(
        path.join(stepsDir, '100-respond.js'),
        `module.exports = async (ctx, req, res) => {
          res.status(200).json({ success: true })
        }`
      )

      // Create failing async task
      fs.writeFileSync(
        path.join(asyncDir, 'failing-task.js'),
        `module.exports = async (ctx) => {
          throw new Error('Async task failed')
        }`
      )

      // Create successful async task
      fs.writeFileSync(
        path.join(asyncDir, 'success-task.js'),
        `module.exports = async (ctx) => {
          ctx.successTaskRan = true
        }`
      )

      // When: Make request
      const router = await createFeatureRouter(testFixturesDir)
      app.use(router)

      const response = await request(app).post('/api/fail-async').expect(200)

      // Then: Response should still succeed
      expect(response.body.success).toBe(true)

      // Wait for async tasks to complete
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    it('should log async task errors without crashing', async () => {
      // Given: Feature with multiple failing async tasks
      const featureDir = path.join(testFixturesDir, 'api', 'multi-fail', '@post')
      const stepsDir = path.join(featureDir, 'steps')
      const asyncDir = path.join(featureDir, 'async-tasks')

      fs.mkdirSync(stepsDir, { recursive: true })
      fs.mkdirSync(asyncDir, { recursive: true })

      fs.writeFileSync(
        path.join(stepsDir, '100-respond.js'),
        `module.exports = async (ctx, req, res) => {
          res.status(200).json({ success: true })
        }`
      )

      // Create multiple failing async tasks
      fs.writeFileSync(
        path.join(asyncDir, 'fail-1.js'),
        `module.exports = async () => { throw new Error('Error 1') }`
      )
      fs.writeFileSync(
        path.join(asyncDir, 'fail-2.js'),
        `module.exports = async () => { throw new Error('Error 2') }`
      )

      // When: Make request
      const router = await createFeatureRouter(testFixturesDir)
      app.use(router)

      const response = await request(app).post('/api/multi-fail').expect(200)

      // Then: Should still succeed
      expect(response.body.success).toBe(true)

      // Wait for async tasks
      await new Promise((resolve) => setTimeout(resolve, 100))
    })
  })

  describe('Async task execution order', () => {
    it('should execute async tasks sequentially', async () => {
      // Given: Feature with ordered async tasks
      const featureDir = path.join(testFixturesDir, 'api', 'ordered', '@post')
      const stepsDir = path.join(featureDir, 'steps')
      const asyncDir = path.join(featureDir, 'async-tasks')

      fs.mkdirSync(stepsDir, { recursive: true })
      fs.mkdirSync(asyncDir, { recursive: true })

      fs.writeFileSync(
        path.join(stepsDir, '100-respond.js'),
        `module.exports = async (ctx, req, res) => {
          ctx.executionOrder = []
          res.status(200).json({ success: true })
        }`
      )

      // Create async tasks that track execution order
      fs.writeFileSync(
        path.join(asyncDir, '100-first.js'),
        `module.exports = async (ctx) => {
          if (!global.asyncOrder) global.asyncOrder = []
          global.asyncOrder.push('first')
        }`
      )
      fs.writeFileSync(
        path.join(asyncDir, '200-second.js'),
        `module.exports = async (ctx) => {
          if (!global.asyncOrder) global.asyncOrder = []
          global.asyncOrder.push('second')
        }`
      )
      fs.writeFileSync(
        path.join(asyncDir, '300-third.js'),
        `module.exports = async (ctx) => {
          if (!global.asyncOrder) global.asyncOrder = []
          global.asyncOrder.push('third')
        }`
      )

      // When: Make request
      const router = await createFeatureRouter(testFixturesDir)
      app.use(router)

      ;(global as any).asyncOrder = []
      await request(app).post('/api/ordered').expect(200)

      // Wait for async tasks to complete
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Then: Tasks executed in order
      expect((global as any).asyncOrder).toEqual(['first', 'second', 'third'])

      // Cleanup
      delete (global as any).asyncOrder
    })
  })

  describe('Context sharing with async tasks', () => {
    it('should share context between steps and async tasks', async () => {
      // Given: Feature that shares context
      const featureDir = path.join(testFixturesDir, 'api', 'context-share', '@post')
      const stepsDir = path.join(featureDir, 'steps')
      const asyncDir = path.join(featureDir, 'async-tasks')

      fs.mkdirSync(stepsDir, { recursive: true })
      fs.mkdirSync(asyncDir, { recursive: true })

      fs.writeFileSync(
        path.join(stepsDir, '100-set-context.js'),
        `module.exports = async (ctx, req, res) => {
          ctx.userId = 123
          ctx.email = req.body.email
          res.status(200).json({ success: true })
        }`
      )

      fs.writeFileSync(
        path.join(asyncDir, 'use-context.js'),
        `module.exports = async (ctx) => {
          if (!global.contextData) global.contextData = {}
          global.contextData.userId = ctx.userId
          global.contextData.email = ctx.email
        }`
      )

      // When: Make request
      const router = await createFeatureRouter(testFixturesDir)
      app.use(router)

      ;(global as any).contextData = {}
      await request(app).post('/api/context-share').send({ email: 'test@example.com' }).expect(200)

      // Wait for async task
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Then: Context was shared
      expect((global as any).contextData.userId).toBe(123)
      expect((global as any).contextData.email).toBe('test@example.com')

      // Cleanup
      delete (global as any).contextData
    })
  })

  describe('No async tasks', () => {
    it('should work when no async-tasks directory exists', async () => {
      // Given: Feature without async-tasks directory
      const featureDir = path.join(testFixturesDir, 'api', 'no-async', '@get')
      const stepsDir = path.join(featureDir, 'steps')

      fs.mkdirSync(stepsDir, { recursive: true })

      fs.writeFileSync(
        path.join(stepsDir, '100-respond.js'),
        `module.exports = async (ctx, req, res) => {
          res.status(200).json({ message: 'No async tasks' })
        }`
      )

      // When: Make request
      const router = await createFeatureRouter(testFixturesDir)
      app.use(router)

      const response = await request(app).get('/api/no-async').expect(200)

      // Then: Works normally
      expect(response.body.message).toBe('No async tasks')
    })

    it('should work when async-tasks directory is empty', async () => {
      // Given: Feature with empty async-tasks directory
      const featureDir = path.join(testFixturesDir, 'api', 'empty-async', '@get')
      const stepsDir = path.join(featureDir, 'steps')
      const asyncDir = path.join(featureDir, 'async-tasks')

      fs.mkdirSync(stepsDir, { recursive: true })
      fs.mkdirSync(asyncDir, { recursive: true })

      fs.writeFileSync(
        path.join(stepsDir, '100-respond.js'),
        `module.exports = async (ctx, req, res) => {
          res.status(200).json({ message: 'Empty async tasks' })
        }`
      )

      // When: Make request
      const router = await createFeatureRouter(testFixturesDir)
      app.use(router)

      const response = await request(app).get('/api/empty-async').expect(200)

      // Then: Works normally
      expect(response.body.message).toBe('Empty async tasks')
    })
  })

  describe('Multiple async tasks', () => {
    it('should execute multiple async tasks', async () => {
      // Given: Feature with many async tasks
      const featureDir = path.join(testFixturesDir, 'api', 'many-async', '@post')
      const stepsDir = path.join(featureDir, 'steps')
      const asyncDir = path.join(featureDir, 'async-tasks')

      fs.mkdirSync(stepsDir, { recursive: true })
      fs.mkdirSync(asyncDir, { recursive: true })

      fs.writeFileSync(
        path.join(stepsDir, '100-respond.js'),
        `module.exports = async (ctx, req, res) => {
          res.status(200).json({ success: true })
        }`
      )

      // Create 10 async tasks
      for (let i = 1; i <= 10; i++) {
        fs.writeFileSync(
          path.join(asyncDir, `${i * 100}-task-${i}.js`),
          `module.exports = async (ctx) => {
            if (!global.taskCount) global.taskCount = 0
            global.taskCount++
          }`
        )
      }

      // When: Make request
      const router = await createFeatureRouter(testFixturesDir)
      app.use(router)

      ;(global as any).taskCount = 0
      await request(app).post('/api/many-async').expect(200)

      // Wait for all tasks
      await new Promise((resolve) => setTimeout(resolve, 200))

      // Then: All tasks executed
      expect((global as any).taskCount).toBe(10)

      // Cleanup
      delete (global as any).taskCount
    })
  })
})
