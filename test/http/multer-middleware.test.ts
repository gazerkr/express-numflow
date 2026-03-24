import * as path from 'path'
import express from 'express'
import request from 'supertest'
import { createFeatureRouter } from '../../src/create-feature-router'

describe('Multer + middlewares pattern', () => {
  let app: express.Express

  beforeAll(async () => {
    app = express()
    const featuresDir = path.resolve(__dirname, '../../test-fixtures/features-multer')
    const router = await createFeatureRouter(featuresDir)
    app.use(router)
    app.use((err: any, _req: any, res: any, _next: any) => {
      res.status(err.status || err.statusCode || 500).json({ error: err.message })
    })
  })

  it('should handle file upload via middlewares', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('file', Buffer.from('test content'), 'test.txt')

    expect(res.status).toBe(200)
    expect(res.body.uploaded).toBeDefined()
    expect(res.body.uploaded.originalname).toBe('test.txt')
  })

  it('should return 400 when no file is uploaded', async () => {
    const res = await request(app)
      .post('/api/upload')
      .send({})

    expect(res.status).toBe(400)
  })

  it('should handle valid file upload end-to-end', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('file', Buffer.from('valid file'), 'valid.txt')

    expect(res.status).toBe(200)
    expect(res.body.uploaded.originalname).toBe('valid.txt')
  })
})
