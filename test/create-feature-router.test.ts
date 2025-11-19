/**
 * createFeatureRouter() Tests
 *
 * TDD Red Phase: Write tests first
 */

import express, { Express } from 'express'
import request from 'supertest'
import { createFeatureRouter } from '../src/create-feature-router'
import * as path from 'path'

describe('createFeatureRouter', () => {
  let app: Express

  beforeEach(() => {
    app = express()
    app.use(express.json())
  })

  describe('Basic Functionality', () => {
    it('should scan Features directory and return Express Router', async () => {
      // Given: Features directory path
      const featuresDir = path.resolve(__dirname, '../test-fixtures/features')

      // When: Call createFeatureRouter
      const router = await createFeatureRouter(featuresDir)

      // Then: Router object returned
      expect(router).toBeDefined()
      expect(typeof router).toBe('function') // Express Router is a function
    })

    it('should throw error for non-existent directory', async () => {
      // Given: Non-existent path
      const nonExistentDir = '/path/to/non/existent/directory'

      // When & Then: Error thrown
      await expect(createFeatureRouter(nonExistentDir)).rejects.toThrow(
        'Features directory not found'
      )
    })
  })

  describe('Feature Registration', () => {
    it('should register Explicit Feature (with index.js) to Router', async () => {
      // Given: Explicit Feature directory
      const featuresDir = path.resolve(__dirname, '../test-fixtures/features-explicit')

      // When: Create and mount Router
      const router = await createFeatureRouter(featuresDir)
      app.use(router)

      // Then: POST /api/users endpoint works
      const response = await request(app)
        .post('/api/users')
        .send({ name: 'John Doe', email: 'john@example.com' })
        .expect(201)

      expect(response.body).toEqual({
        success: true,
        userId: expect.any(Number),
        name: 'John Doe',
      })
    })

    it('should register Implicit Feature (without index.js) to Router', async () => {
      // Given: Implicit Feature directory
      const featuresDir = path.resolve(__dirname, '../test-fixtures/features-implicit')

      // When: Create and mount Router
      const router = await createFeatureRouter(featuresDir)
      app.use(router)

      // Then: GET /greet endpoint works
      const response = await request(app).get('/greet').expect(200)

      expect(response.body).toEqual({
        message: 'Hello, World!',
      })
    })

    it('should register multiple Features simultaneously', async () => {
      // Given: Directory with multiple Features
      const featuresDir = path.resolve(__dirname, '../test-fixtures/features-multiple')

      // When: Create and mount Router
      const router = await createFeatureRouter(featuresDir)
      app.use(router)

      // Then: All endpoints work
      await request(app).get('/api/users').expect(200)
      await request(app).post('/api/users').expect(201)
      await request(app).get('/api/orders').expect(200)
    })
  })

  describe('Convention over Configuration', () => {
    it('should auto-infer HTTP method from folder structure', async () => {
      // Given: @post, @get folders
      const featuresDir = path.resolve(__dirname, '../test-fixtures/features-convention')

      // When: Create and mount Router
      const router = await createFeatureRouter(featuresDir)
      app.use(router)

      // Then: POST /api/orders, GET /api/products work
      await request(app).post('/api/orders').send({}).expect(201)
      await request(app).get('/api/products').expect(200)
    })

    it('should auto-infer path from folder structure', async () => {
      // Given: api/v1/users/@post structure
      const featuresDir = path.resolve(__dirname, '../test-fixtures/features-path')

      // When: Create and mount Router
      const router = await createFeatureRouter(featuresDir)
      app.use(router)

      // Then: POST /api/v1/users works
      await request(app).post('/api/v1/users').send({}).expect(201)
    })

    it('should support dynamic routes', async () => {
      // Given: [id] folder structure
      const featuresDir = path.resolve(__dirname, '../test-fixtures/features-dynamic')

      // When: Create and mount Router
      const router = await createFeatureRouter(featuresDir)
      app.use(router)

      // Then: GET /users/:id works
      const response = await request(app).get('/users/123').expect(200)

      expect(response.body).toEqual({
        userId: '123',
      })
    })
  })

  describe('Steps Execution', () => {
    it('should execute Steps sequentially', async () => {
      // Given: Feature with Steps
      const featuresDir = path.resolve(__dirname, '../test-fixtures/features-steps')

      // When: Create and mount Router
      const router = await createFeatureRouter(featuresDir)
      app.use(router)

      // Then: All Steps execute sequentially and return result
      const response = await request(app)
        .post('/api/orders')
        .send({ productId: 1, quantity: 2 })
        .expect(201)

      expect(response.body).toEqual({
        success: true,
        orderId: expect.any(Number),
        validated: true,
        stockChecked: true,
        orderCreated: true,
      })
    })

    it('should call onError handler when Step throws error', async () => {
      // Given: Step that throws error
      const featuresDir = path.resolve(__dirname, '../test-fixtures/features-error')

      // When: Create and mount Router
      const router = await createFeatureRouter(featuresDir)
      app.use(router)

      // Then: onError handler handles error
      const response = await request(app)
        .post('/api/orders')
        .send({ productId: 999 }) // Out of stock
        .expect(400)

      expect(response.body).toEqual({
        success: false,
        error: 'Product out of stock',
      })
    })
  })

  describe('Async Tasks', () => {
    it('should execute Async Tasks in background', async () => {
      // Given: Feature with Async Tasks
      const featuresDir = path.resolve(__dirname, '../test-fixtures/features-async')

      // When: Create and mount Router
      const router = await createFeatureRouter(featuresDir)
      app.use(router)

      // Then: Response returned immediately, Async Tasks run in background
      const response = await request(app)
        .post('/api/orders')
        .send({ email: 'test@example.com' })
        .expect(201)

      expect(response.body).toEqual({
        success: true,
        orderId: expect.any(Number),
      })

      // Async Tasks run in background, don't affect response
      // (Actual email sending can be verified via logs)
    })
  })

  describe('Options', () => {
    it('should output logs when debug option is true', async () => {
      // Given: debug option
      const featuresDir = path.resolve(__dirname, '../test-fixtures/features-explicit')
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      // When: Create Router with debug mode
      await createFeatureRouter(featuresDir, { debug: true })

      // Then: Debug logs output
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[express-numflow]')
      )

      consoleSpy.mockRestore()
    })

    it('should exclude specific directories with excludeDirs option', async () => {
      // Given: excludeDirs option
      const featuresDir = path.resolve(__dirname, '../test-fixtures/features-exclude')

      // When: Exclude node_modules, test directories
      const router = await createFeatureRouter(featuresDir, {
        excludeDirs: ['node_modules', 'test', 'excluded'],
      })

      app.use(router)

      // Then: Features in excluded directories are not registered
      await request(app).get('/excluded/route').expect(404)
    })
  })

  describe('Express Integration', () => {
    it('should coexist with existing Express routes', async () => {
      // Given: Existing Express routes
      app.get('/health', (_req, res) => {
        res.json({ status: 'ok' })
      })

      // When: Add Feature Router
      const featuresDir = path.resolve(__dirname, '../test-fixtures/features-explicit')
      const router = await createFeatureRouter(featuresDir)
      app.use(router)

      // Then: Both existing routes and Feature routes work
      await request(app).get('/health').expect(200)
      await request(app).post('/api/users').send({ name: 'Test', email: 'test@example.com' }).expect(201)
    })

    it('should be mountable on different paths', async () => {
      // Given: Feature Router
      const featuresDir = path.resolve(__dirname, '../test-fixtures/features-explicit')
      const router = await createFeatureRouter(featuresDir)

      // When: Mount on /api path
      app.use('/api', router)

      // Then: Works with /api prefix
      await request(app).post('/api/api/users').send({ name: 'Test', email: 'test@example.com' }).expect(201)
    })

    it('should allow multiple Feature Routers mounted on different paths', async () => {
      // Given: 2 Feature Routers
      const apiRouter = await createFeatureRouter(
        path.resolve(__dirname, '../test-fixtures/features-api-short')
      )
      const adminRouter = await createFeatureRouter(
        path.resolve(__dirname, '../test-fixtures/features-admin-short')
      )

      // When: Mount on different paths
      app.use('/api', apiRouter)
      app.use('/admin', adminRouter)

      // Then: Work on respective paths
      await request(app).get('/api/users').expect(200)
      await request(app).get('/admin/dashboard').expect(200)
    })
  })
})
