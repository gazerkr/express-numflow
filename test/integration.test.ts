/**
 * Integration Tests
 *
 * Validates actual behavior using TDD approach.
 */

import express, { Express } from 'express'
import request from 'supertest'
import { createFeatureRouter } from '../src/create-feature-router'
import * as path from 'path'

describe('Integration Tests', () => {
  describe('createFeatureRouter - Explicit Feature', () => {
    let app: Express

    beforeEach(() => {
      app = express()
      app.use(express.json())
    })

    it('should work with Explicit Feature (with index.js)', async () => {
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

    it('should return 400 error on validation failure', async () => {
      // Given: Explicit Feature
      const featuresDir = path.resolve(__dirname, '../test-fixtures/features-explicit')
      const router = await createFeatureRouter(featuresDir)
      app.use(router)

      // When: Send invalid data
      const response = await request(app)
        .post('/api/users')
        .send({}) // Missing name and email
        .expect(400)

      // Then: Error message returned
      expect(response.body).toEqual({
        success: false,
        error: 'Name and email are required',
      })
    })
  })

  describe('createFeatureRouter - Implicit Feature', () => {
    let app: Express

    beforeEach(() => {
      app = express()
      app.use(express.json())
    })

    it('should work with Implicit Feature (without index.js)', async () => {
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
  })

  describe('createFeatureRouter - Multiple Features', () => {
    let app: Express

    beforeEach(() => {
      app = express()
      app.use(express.json())
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

  describe('createFeatureRouter - Express Integration', () => {
    let app: Express

    beforeEach(() => {
      app = express()
      app.use(express.json())
    })

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
      await request(app).post('/api/users').send({ name: 'John', email: 'john@test.com' }).expect(201)
    })
  })

  describe('Error Handling', () => {
    it('should throw error for non-existent directory', async () => {
      // Given: Non-existent path
      const nonExistentDir = '/path/to/non/existent/directory'

      // When & Then: Error thrown
      await expect(createFeatureRouter(nonExistentDir)).rejects.toThrow(
        'Features directory not found'
      )
    })
  })

  describe('Debug Mode', () => {
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
  })
})
