/**
 * ESM Support Tests with Vitest
 *
 * Vitest natively supports ESM, so .mjs files should work perfectly
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import express, { Express } from 'express'
import request from 'supertest'
// Test against built code (more realistic E2E test)
import { createFeatureRouter } from '../dist/cjs/index.js'
import * as path from 'path'

describe('ESM Support with Vitest', () => {
  describe('Pure ESM Features (.mjs files)', () => {
    let app: Express

    beforeEach(() => {
      app = express()
      app.use(express.json())
    })

    it('should support .mjs step files with export default', async () => {
      // Given: Feature directory with .mjs step files
      const featuresDir = path.resolve(__dirname, '../test-fixtures/features-esm')

      // When: Create and mount Router
      const router = await createFeatureRouter(featuresDir)
      app.use(router)

      // Then: POST /todos endpoint works with ESM steps
      const response = await request(app)
        .post('/todos')
        .send({ title: 'Vitest ESM Todo', completed: false })
        .expect(201)

      expect(response.body).toEqual({
        success: true,
        todo: {
          id: expect.any(Number),
          title: 'Vitest ESM Todo',
          completed: false,
          createdAt: expect.any(String),
        },
      })
    })

    it('should support .mjs files with ESM imports between steps', async () => {
      // Given: Feature directory with .mjs files that import from each other
      const featuresDir = path.resolve(__dirname, '../test-fixtures/features-esm')
      const router = await createFeatureRouter(featuresDir)
      app.use(router)

      // When: Create a todo
      await request(app)
        .post('/todos')
        .send({ title: 'ESM Import Test', completed: false })
        .expect(201)

      // Then: GET /todos should work and access the shared module
      const response = await request(app).get('/todos').expect(200)

      expect(response.body).toEqual({
        success: true,
        todos: expect.arrayContaining([
          expect.objectContaining({
            title: 'ESM Import Test',
          }),
        ]),
        count: expect.any(Number),
      })
    })

    it('should support .mjs async tasks with export default', async () => {
      // Given: Feature with .mjs async tasks
      const featuresDir = path.resolve(__dirname, '../test-fixtures/features-esm')
      const router = await createFeatureRouter(featuresDir)
      app.use(router)

      // Capture console.log to verify async task ran
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      // When: Create a todo (triggers async task)
      await request(app)
        .post('/todos')
        .send({ title: 'Async Task Test', completed: false })
        .expect(201)

      // Wait for async task to complete
      await new Promise(resolve => setTimeout(resolve, 200))

      // Then: Async task should have logged
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Async Task - ESM]',
        expect.objectContaining({
          action: 'TODO_CREATED',
          todoId: expect.any(Number),
        })
      )

      consoleSpy.mockRestore()
    })

    it('should handle validation errors in .mjs steps', async () => {
      // Given: Feature with .mjs validation step
      const featuresDir = path.resolve(__dirname, '../test-fixtures/features-esm')
      const router = await createFeatureRouter(featuresDir)
      app.use(router)

      // When: Send invalid data
      const response = await request(app)
        .post('/todos')
        .send({ completed: false }) // Missing title
        .expect(400)

      // Then: Should receive validation error
      expect(response.body).toEqual({
        error: 'Title is required and must be a string',
      })
    })
  })

  describe('Mixed CommonJS and ESM', () => {
    let app: Express

    beforeEach(() => {
      app = express()
      app.use(express.json())
    })

    it('should support mixing .js (CommonJS) and .mjs (ESM) files', async () => {
      // Given: Feature with mixed .js and .mjs files
      const featuresDir = path.resolve(__dirname, '../test-fixtures/features-mixed')
      const router = await createFeatureRouter(featuresDir)
      app.use(router)

      // When: POST /products with mixed steps
      const response = await request(app)
        .post('/products')
        .send({ name: 'Vitest Mixed Product', price: 199.99 })
        .expect(201)

      // Then: Should work seamlessly
      expect(response.body).toEqual({
        success: true,
        product: {
          id: expect.any(Number),
          name: 'Vitest Mixed Product',
          price: 199.99,
          createdAt: expect.any(String),
        },
        message: 'Mixed CommonJS and ESM works!',
      })
    })

    it('should execute steps in correct order regardless of module type', async () => {
      // Given: Feature with mixed steps
      const featuresDir = path.resolve(__dirname, '../test-fixtures/features-mixed')
      const router = await createFeatureRouter(featuresDir)
      app.use(router)

      // When: Make request
      const response = await request(app)
        .post('/products')
        .send({ name: 'Order Test', price: 50 })
        .expect(201)

      // Then: All steps should have executed
      expect(response.body.success).toBe(true)
      expect(response.body.product.name).toBe('Order Test')
      expect(response.body.product.price).toBe(50)
    })
  })

  describe('Edge Cases', () => {
    let app: Express

    beforeEach(() => {
      app = express()
      app.use(express.json())
    })

    it('should handle early response in .mjs steps', async () => {
      // Given: Feature with .mjs validation that returns early
      const featuresDir = path.resolve(__dirname, '../test-fixtures/features-esm')
      const router = await createFeatureRouter(featuresDir)
      app.use(router)

      // When: Send invalid data (early return in step 1)
      const response = await request(app)
        .post('/todos')
        .send({}) // No title
        .expect(400)

      // Then: Should return immediately without executing remaining steps
      expect(response.body.error).toBeTruthy()
    })

    it('should share context between .js and .mjs steps', async () => {
      // Given: Mixed feature
      const featuresDir = path.resolve(__dirname, '../test-fixtures/features-mixed')
      const router = await createFeatureRouter(featuresDir)
      app.use(router)

      // When: Make request
      const response = await request(app)
        .post('/products')
        .send({ name: 'Context Test', price: 99 })
        .expect(201)

      // Then: Context should have been shared across all steps
      // (validated in .js, created in .mjs, responded in .js)
      expect(response.body.product).toMatchObject({
        name: 'Context Test',
        price: 99,
      })
    })
  })

  describe('Performance', () => {
    it('should load .mjs files without significant overhead', async () => {
      const featuresDir = path.resolve(__dirname, '../test-fixtures/features-esm')

      // Measure loading time
      const startTime = performance.now()
      await createFeatureRouter(featuresDir)
      const endTime = performance.now()

      const loadTime = endTime - startTime

      // Should load within reasonable time (< 500ms)
      expect(loadTime).toBeLessThan(500)
    })
  })
})
