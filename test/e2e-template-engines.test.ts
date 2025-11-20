/**
 * E2E Template Engine Tests
 *
 * Tests real Express apps with real template engines (EJS, Pug)
 * using express-numflow's Feature-First architecture
 */

import express, { Express } from 'express'
import request from 'supertest'
import path from 'path'
import { createFeatureRouter } from '../src'
import fs from 'fs'

describe('E2E Template Engine Tests', () => {
  describe('EJS Template Engine', () => {
    let app: Express
    const featuresDir = path.join(__dirname, 'fixtures', 'features-ejs')

    beforeAll(async () => {
      // Create test features directory structure
      const featureDir = path.join(featuresDir, 'home', '@get', 'steps')
      fs.mkdirSync(featureDir, { recursive: true })

      // Create step file that uses res.render()
      fs.writeFileSync(
        path.join(featureDir, '100-render.js'),
        `
module.exports = async (ctx, req, res) => {
  res.render('test', {
    title: 'EJS E2E Test',
    message: 'Hello from EJS!',
    user: { name: 'Test User' }
  })
}
        `.trim()
      )

      // Create Express app
      app = express()
      app.set('view engine', 'ejs')
      app.set('views', path.join(__dirname, 'fixtures', 'views'))

      // Use express-numflow
      const router = await createFeatureRouter(featuresDir)
      app.use(router)
    })

    afterAll(() => {
      // Cleanup
      if (fs.existsSync(featuresDir)) {
        fs.rmSync(featuresDir, { recursive: true, force: true })
      }
    })

    it('should render EJS template successfully via HTTP request', async () => {
      const response = await request(app).get('/home')

      expect(response.status).toBe(200)
      expect(response.text).toContain('EJS E2E Test')
      expect(response.text).toContain('Hello from EJS!')
      expect(response.text).toContain('Hello, Test User!')
    })
  })

  describe('Pug Template Engine', () => {
    let app: Express
    const featuresDir = path.join(__dirname, 'fixtures', 'features-pug')

    beforeAll(async () => {
      // Create test features directory structure
      const featureDir = path.join(featuresDir, 'about', '@get', 'steps')
      fs.mkdirSync(featureDir, { recursive: true })

      // Create step file that uses res.render()
      fs.writeFileSync(
        path.join(featureDir, '100-render.js'),
        `
module.exports = async (ctx, req, res) => {
  res.render('test', {
    title: 'Pug E2E Test',
    message: 'Hello from Pug!',
    user: { name: 'Pug User' }
  })
}
        `.trim()
      )

      // Create Express app
      app = express()
      app.set('view engine', 'pug')
      app.set('views', path.join(__dirname, 'fixtures', 'views'))

      // Use express-numflow
      const router = await createFeatureRouter(featuresDir)
      app.use(router)
    })

    afterAll(() => {
      // Cleanup
      if (fs.existsSync(featuresDir)) {
        fs.rmSync(featuresDir, { recursive: true, force: true })
      }
    })

    it('should render Pug template successfully via HTTP request', async () => {
      const response = await request(app).get('/about')

      expect(response.status).toBe(200)
      expect(response.text).toContain('Pug E2E Test')
      expect(response.text).toContain('Hello from Pug!')
      expect(response.text).toContain('Hello, Pug User!')
    })
  })

  describe('Multiple template engines in same app', () => {
    let app: Express
    const ejsFeaturesDir = path.join(__dirname, 'fixtures', 'features-mixed-ejs')
    const pugFeaturesDir = path.join(__dirname, 'fixtures', 'features-mixed-pug')

    beforeAll(async () => {
      // Create EJS feature
      const ejsFeatureDir = path.join(ejsFeaturesDir, 'ejs-page', '@get', 'steps')
      fs.mkdirSync(ejsFeatureDir, { recursive: true })
      fs.writeFileSync(
        path.join(ejsFeatureDir, '100-render.js'),
        `
module.exports = async (ctx, req, res) => {
  res.render('test.ejs', {
    title: 'EJS Mixed',
    message: 'EJS in mixed app',
    user: null
  })
}
        `.trim()
      )

      // Create Pug feature
      const pugFeatureDir = path.join(pugFeaturesDir, 'pug-page', '@get', 'steps')
      fs.mkdirSync(pugFeatureDir, { recursive: true })
      fs.writeFileSync(
        path.join(pugFeatureDir, '100-render.js'),
        `
module.exports = async (ctx, req, res) => {
  res.render('test.pug', {
    title: 'Pug Mixed',
    message: 'Pug in mixed app',
    user: null
  })
}
        `.trim()
      )

      // Create Express app
      app = express()
      app.set('views', path.join(__dirname, 'fixtures', 'views'))

      // Use express-numflow for both
      const ejsRouter = await createFeatureRouter(ejsFeaturesDir)
      const pugRouter = await createFeatureRouter(pugFeaturesDir)
      app.use(ejsRouter)
      app.use(pugRouter)
    })

    afterAll(() => {
      // Cleanup
      if (fs.existsSync(ejsFeaturesDir)) {
        fs.rmSync(ejsFeaturesDir, { recursive: true, force: true })
      }
      if (fs.existsSync(pugFeaturesDir)) {
        fs.rmSync(pugFeaturesDir, { recursive: true, force: true })
      }
    })

    it('should render EJS template in mixed app', async () => {
      const response = await request(app).get('/ejs-page')

      expect(response.status).toBe(200)
      expect(response.text).toContain('EJS Mixed')
      expect(response.text).toContain('EJS in mixed app')
    })

    it('should render Pug template in mixed app', async () => {
      const response = await request(app).get('/pug-page')

      expect(response.status).toBe(200)
      expect(response.text).toContain('Pug Mixed')
      expect(response.text).toContain('Pug in mixed app')
    })
  })

  describe('Template rendering with context data', () => {
    let app: Express
    const featuresDir = path.join(__dirname, 'fixtures', 'features-context')

    beforeAll(async () => {
      // Create multi-step feature
      const featureDir = path.join(featuresDir, 'blog', '@get', 'steps')
      fs.mkdirSync(featureDir, { recursive: true })

      // Step 1: Fetch data
      fs.writeFileSync(
        path.join(featureDir, '100-fetch-data.js'),
        `
module.exports = async (ctx, req, res) => {
  ctx.posts = [
    { id: 1, title: 'First Post', content: 'Content 1' },
    { id: 2, title: 'Second Post', content: 'Content 2' }
  ]
}
        `.trim()
      )

      // Step 2: Render with data
      fs.writeFileSync(
        path.join(featureDir, '200-render.js'),
        `
module.exports = async (ctx, req, res) => {
  res.render('test', {
    title: 'Blog',
    message: 'Posts: ' + ctx.posts.length,
    user: null
  })
}
        `.trim()
      )

      // Create Express app
      app = express()
      app.set('view engine', 'ejs')
      app.set('views', path.join(__dirname, 'fixtures', 'views'))

      const router = await createFeatureRouter(featuresDir)
      app.use(router)
    })

    afterAll(() => {
      // Cleanup
      if (fs.existsSync(featuresDir)) {
        fs.rmSync(featuresDir, { recursive: true, force: true })
      }
    })

    it('should pass context data to template', async () => {
      const response = await request(app).get('/blog')

      expect(response.status).toBe(200)
      expect(response.text).toContain('Posts: 2')
    })
  })
})
