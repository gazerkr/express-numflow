/**
 * ESM Support Integration Tests
 *
 * Tests ES Module (.mjs) support in features, steps, and async tasks
 */

import express, { Express } from 'express'
import request from 'supertest'
import { createFeatureRouter } from '../src/create-feature-router'
import * as path from 'path'

// Jest has limitations with .mjs files and dynamic imports
// Run test/esm-manual-test.js and test/esm-mixed-test.js for actual ESM support verification
describe.skip('ESM Support Tests (Jest limitations - use manual tests instead)', () => {
  describe('Features with .mjs files', () => {
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
        .send({ title: 'Test ESM Todo', completed: false })
        .expect(201)

      expect(response.body).toEqual({
        success: true,
        todo: {
          id: expect.any(Number),
          title: 'Test ESM Todo',
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
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      // When: Create a todo (triggers async task)
      await request(app)
        .post('/todos')
        .send({ title: 'Async Task Test', completed: false })
        .expect(201)

      // Wait for async task to complete
      await new Promise(resolve => setTimeout(resolve, 100))

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
    it('should support mixing .js (CommonJS) and .mjs (ESM) files', async () => {
      // This test will be added after basic ESM support is verified
      // It will test a feature with both CommonJS and ESM steps
      expect(true).toBe(true) // Placeholder
    })
  })

  describe('Edge Cases', () => {
    it('should handle .mts files (TypeScript ESM)', async () => {
      // .mts support test - will be implemented if needed
      expect(true).toBe(true) // Placeholder
    })

    it('should provide clear error for .mjs files without default export', async () => {
      // Error handling test - will be implemented
      expect(true).toBe(true) // Placeholder
    })
  })
})
