/**
 * Edge Cases Tests
 *
 * Tests for various edge cases and unusual scenarios
 */

import express, { Express } from 'express'
import request from 'supertest'
import { createFeatureRouter } from '../src/create-feature-router'
import { feature } from '../src/feature/feature'
import * as path from 'path'
import * as fs from 'fs'

describe('Edge Cases', () => {
  let app: Express
  const testFixturesDir = path.resolve(__dirname, './test-fixtures/features-edge-cases')

  beforeAll(() => {
    fs.mkdirSync(testFixturesDir, { recursive: true })
  })

  afterAll(() => {
    if (fs.existsSync(testFixturesDir)) {
      fs.rmSync(testFixturesDir, { recursive: true, force: true })
    }
  })

  beforeEach(() => {
    app = express()
    app.use(express.json())
  })

  describe('Empty directories', () => {
    it('should handle empty features directory', async () => {
      // Given: Empty features directory
      const emptyDir = path.join(testFixturesDir, 'empty')
      fs.mkdirSync(emptyDir, { recursive: true })

      // When: Create router
      const router = await createFeatureRouter(emptyDir)
      app.use(router)

      // Then: Router works but has no routes
      const response = await request(app).get('/anything').expect(404)
      expect(response.status).toBe(404)
    })
  })

  describe('Deep nesting', () => {
    it('should handle deeply nested routes', async () => {
      // Given: Deeply nested route structure
      const featureDir = path.join(
        testFixturesDir,
        'deep',
        'api',
        'v1',
        'users',
        '[userId]',
        'posts',
        '[postId]',
        'comments',
        '[commentId]',
        '@get'
      )
      const stepsDir = path.join(featureDir, 'steps')
      fs.mkdirSync(stepsDir, { recursive: true })

      fs.writeFileSync(
        path.join(stepsDir, '100-respond.js'),
        `module.exports = async (ctx, req, res) => {
          res.status(200).json({
            userId: req.params.userId,
            postId: req.params.postId,
            commentId: req.params.commentId
          })
        }`
      )

      // When: Create router
      const router = await createFeatureRouter(path.join(testFixturesDir, 'deep'))
      app.use(router)

      // Then: Deep route works
      const response = await request(app)
        .get('/api/v1/users/123/posts/456/comments/789')
        .expect(200)

      expect(response.body).toEqual({
        userId: '123',
        postId: '456',
        commentId: '789',
      })
    })
  })

  describe('Context isolation', () => {
    it('should isolate context between concurrent requests', async () => {
      // Given: Feature that uses context
      const featureDir = path.join(testFixturesDir, 'context-isolation', 'isolation', '@get')
      const stepsDir = path.join(featureDir, 'steps')
      fs.mkdirSync(stepsDir, { recursive: true })

      fs.writeFileSync(
        path.join(stepsDir, '100-set-value.js'),
        `module.exports = async (ctx, req, res) => {
          ctx.requestId = req.query.id
          await new Promise(resolve => setTimeout(resolve, 50))
        }`
      )

      fs.writeFileSync(
        path.join(stepsDir, '200-respond.js'),
        `module.exports = async (ctx, req, res) => {
          res.status(200).json({ requestId: ctx.requestId })
        }`
      )

      // When: Make concurrent requests
      const router = await createFeatureRouter(path.join(testFixturesDir, 'context-isolation'))
      app.use(router)

      const [response1, response2, response3] = await Promise.all([
        request(app).get('/isolation?id=request-1'),
        request(app).get('/isolation?id=request-2'),
        request(app).get('/isolation?id=request-3'),
      ])

      // Then: Each request has its own context
      expect(response1.body.requestId).toBe('request-1')
      expect(response2.body.requestId).toBe('request-2')
      expect(response3.body.requestId).toBe('request-3')
    })
  })

  describe('Response already sent', () => {
    it('should handle case where response is sent in early step', async () => {
      // Given: Feature where first step sends response
      const featureDir = path.join(testFixturesDir, 'response-tests', 'early-response', '@post')
      const stepsDir = path.join(featureDir, 'steps')
      fs.mkdirSync(stepsDir, { recursive: true })

      fs.writeFileSync(
        path.join(stepsDir, '100-early-response.js'),
        `module.exports = async (ctx, req, res) => {
          res.status(200).json({ early: true })
        }`
      )

      fs.writeFileSync(
        path.join(stepsDir, '200-late-response.js'),
        `module.exports = async (ctx, req, res) => {
          // This should not send another response
          ctx.lateStepExecuted = true
        }`
      )

      // When: Make request
      const router = await createFeatureRouter(path.join(testFixturesDir, 'response-tests'))
      app.use(router)

      const response = await request(app).post('/early-response').expect(200)

      // Then: First response is returned
      expect(response.body.early).toBe(true)
    })
  })

  describe('Large payloads', () => {
    it('should handle large request bodies', async () => {
      // Given: Feature that processes large payload
      const featureDir = path.join(testFixturesDir, 'payload-tests', 'large-payload', '@post')
      const stepsDir = path.join(featureDir, 'steps')
      fs.mkdirSync(stepsDir, { recursive: true })

      fs.writeFileSync(
        path.join(stepsDir, '100-process.js'),
        `module.exports = async (ctx, req, res) => {
          const dataSize = JSON.stringify(req.body).length
          res.status(200).json({ dataSize })
        }`
      )

      // When: Send large payload
      const router = await createFeatureRouter(path.join(testFixturesDir, 'payload-tests'))
      app.use(router)

      const largeData = {
        items: Array(1000)
          .fill(null)
          .map((_, i) => ({ id: i, value: `item-${i}`.repeat(10) })),
      }

      const response = await request(app).post('/large-payload').send(largeData).expect(200)

      // Then: Large payload processed
      expect(response.body.dataSize).toBeGreaterThan(10000)
    })
  })

  describe('Empty responses', () => {
    it('should handle step that does not send response', async () => {
      // Given: Feature where no step sends response
      const featureDir = path.join(testFixturesDir, 'response-tests', 'no-response', '@get')
      const stepsDir = path.join(featureDir, 'steps')
      fs.mkdirSync(stepsDir, { recursive: true })

      fs.writeFileSync(
        path.join(stepsDir, '100-do-nothing.js'),
        `module.exports = async (ctx, req, res) => {
          ctx.executed = true
          // No response sent
        }`
      )

      // When: Make request
      const router = await createFeatureRouter(path.join(testFixturesDir, 'response-tests'))
      app.use(router)

      // Then: Express handles it (likely hangs or times out, so we just check it doesn't crash)
      // We set a short timeout to avoid test hanging
      const response = await request(app).get('/no-response').timeout(1000)

      // The behavior depends on Express - it might return 200, 404, or 500
      expect([200, 404, 500]).toContain(response.status)
    })
  })

  describe('Multiple dynamic parameters', () => {
    it('should handle multiple dynamic parameters in same level', async () => {
      // Given: Route with multiple params
      const featureDir = path.join(testFixturesDir, 'param-tests', '[id]', '[slug]', '@get')
      const stepsDir = path.join(featureDir, 'steps')
      fs.mkdirSync(stepsDir, { recursive: true })

      fs.writeFileSync(
        path.join(stepsDir, '100-respond.js'),
        `module.exports = async (ctx, req, res) => {
          res.status(200).json({
            id: req.params.id,
            slug: req.params.slug
          })
        }`
      )

      // When: Make request
      const router = await createFeatureRouter(path.join(testFixturesDir, 'param-tests'))
      app.use(router)

      const response = await request(app).get('/123/my-slug').expect(200)

      // Then: Both params captured
      expect(response.body.id).toBe('123')
      expect(response.body.slug).toBe('my-slug')
    })
  })

  describe('Feature API', () => {
    it('should create feature with feature() function', () => {
      // Given: Feature configuration
      const testFeature = feature({
        method: 'GET',
        path: '/test',
      })

      // Then: Feature object is created
      expect(testFeature).toBeDefined()
      expect(typeof testFeature).toBe('object')
    })
  })
})
