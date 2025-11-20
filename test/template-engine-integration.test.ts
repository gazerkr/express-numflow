/**
 * Template Engine Integration Tests
 *
 * Tests for real template engines (EJS, Pug, etc.) with res.render()
 * These tests ensure that express-numflow works correctly with actual template engines
 */

import express, { Express } from 'express'
import path from 'path'
import { AutoExecutor } from '../src/feature/auto-executor'
import { StepInfo } from '../src/feature/types'

describe('Template Engine Integration', () => {
  describe('EJS Template Engine', () => {
    let app: Express

    beforeEach(() => {
      app = express()
      app.set('view engine', 'ejs')
      app.set('views', path.join(__dirname, 'fixtures', 'views'))
    })

    it('should render EJS template without callback', async () => {
      const req: any = {
        method: 'GET',
        url: '/test',
        app,
      }

      let renderedHtml = ''
      const res: any = {
        headersSent: false,
        app,
        render: function (this: any, view: string, locals: any, callback?: Function) {
          // Use actual Express render method
          app.render(view, locals, (err: Error | null, html?: string) => {
            if (err) {
              if (callback) callback(err)
              return
            }
            renderedHtml = html || ''
            this.headersSent = true
            if (callback) callback(null, html)
          })
        },
        send: function (this: any, _body: any) {
          this.headersSent = true
          return this
        },
      }

      const steps: StepInfo[] = [
        {
          number: 100,
          name: '100-render-ejs.js',
          path: '/fake/path',
          fn: async (_ctx: any, _req: any, res: any) => {
            res.render('test', {
              title: 'EJS Test',
              message: 'Hello from EJS!',
              user: { name: 'John' },
            })
          },
        },
      ]

      const executor = new AutoExecutor({
        steps,
        context: {},
        req,
        res,
      })

      await expect(executor.execute()).resolves.not.toThrow()

      // Verify EJS template was rendered
      expect(renderedHtml).toContain('EJS Test')
      expect(renderedHtml).toContain('Hello from EJS!')
      expect(renderedHtml).toContain('Hello, John!')
      expect(res.headersSent).toBe(true)
    })

    it('should render EJS template with callback', async () => {
      const req: any = {
        method: 'GET',
        url: '/test',
        app,
      }

      let renderedHtml = ''
      let userCallbackCalled = false

      const res: any = {
        headersSent: false,
        app,
        render: function (this: any, view: string, locals: any, callback?: Function) {
          app.render(view, locals, (err: Error | null, html?: string) => {
            if (err) {
              if (callback) callback(err)
              return
            }
            renderedHtml = html || ''
            this.headersSent = true
            if (callback) callback(null, html)
          })
        },
      }

      const steps: StepInfo[] = [
        {
          number: 100,
          name: '100-render-ejs.js',
          path: '/fake/path',
          fn: async (_ctx: any, _req: any, res: any) => {
            res.render('test', { title: 'EJS Test', message: 'Test', user: null }, (err: any) => {
              if (err) throw err
              userCallbackCalled = true
            })
          },
        },
      ]

      const executor = new AutoExecutor({
        steps,
        context: {},
        req,
        res,
      })

      await executor.execute()

      expect(userCallbackCalled).toBe(true)
      expect(renderedHtml).toContain('EJS Test')
      expect(res.headersSent).toBe(true)
    })

    it('should handle EJS rendering errors properly', async () => {
      const req: any = {
        method: 'GET',
        url: '/test',
        app,
      }

      const res: any = {
        headersSent: false,
        app,
        render: function (this: any, _view: string, _locals: any, callback?: Function) {
          // Simulate template rendering error
          setImmediate(() => {
            const error = new Error('Template rendering failed')
            if (callback) {
              callback(error)
            }
          })
        },
      }

      const steps: StepInfo[] = [
        {
          number: 100,
          name: '100-render-ejs.js',
          path: '/fake/path',
          fn: async (_ctx: any, _req: any, res: any) => {
            res.render('test', { title: 'Test' })
          },
        },
      ]

      const executor = new AutoExecutor({
        steps,
        context: {},
        req,
        res,
      })

      await expect(executor.execute()).rejects.toThrow('Template rendering failed')
    })
  })

  describe('Pug Template Engine', () => {
    let app: Express

    beforeEach(() => {
      app = express()
      app.set('view engine', 'pug')
      app.set('views', path.join(__dirname, 'fixtures', 'views'))
    })

    it('should render Pug template without callback', async () => {
      const req: any = {
        method: 'GET',
        url: '/test',
        app,
      }

      let renderedHtml = ''
      const res: any = {
        headersSent: false,
        app,
        render: function (this: any, view: string, locals: any, callback?: Function) {
          // Use actual Express render method
          app.render(view, locals, (err: Error | null, html?: string) => {
            if (err) {
              if (callback) callback(err)
              return
            }
            renderedHtml = html || ''
            this.headersSent = true
            if (callback) callback(null, html)
          })
        },
        send: function (this: any, _body: any) {
          this.headersSent = true
          return this
        },
      }

      const steps: StepInfo[] = [
        {
          number: 100,
          name: '100-render-pug.js',
          path: '/fake/path',
          fn: async (_ctx: any, _req: any, res: any) => {
            res.render('test', {
              title: 'Pug Test',
              message: 'Hello from Pug!',
              user: { name: 'Jane' },
            })
          },
        },
      ]

      const executor = new AutoExecutor({
        steps,
        context: {},
        req,
        res,
      })

      await expect(executor.execute()).resolves.not.toThrow()

      // Verify Pug template was rendered
      expect(renderedHtml).toContain('Pug Test')
      expect(renderedHtml).toContain('Hello from Pug!')
      expect(renderedHtml).toContain('Hello, Jane!')
      expect(res.headersSent).toBe(true)
    })

    it('should render Pug template with callback', async () => {
      const req: any = {
        method: 'GET',
        url: '/test',
        app,
      }

      let renderedHtml = ''
      let userCallbackCalled = false

      const res: any = {
        headersSent: false,
        app,
        render: function (this: any, view: string, locals: any, callback?: Function) {
          app.render(view, locals, (err: Error | null, html?: string) => {
            if (err) {
              if (callback) callback(err)
              return
            }
            renderedHtml = html || ''
            this.headersSent = true
            if (callback) callback(null, html)
          })
        },
      }

      const steps: StepInfo[] = [
        {
          number: 100,
          name: '100-render-pug.js',
          path: '/fake/path',
          fn: async (_ctx: any, _req: any, res: any) => {
            res.render('test', { title: 'Pug Test', message: 'Test', user: null }, (err: any) => {
              if (err) throw err
              userCallbackCalled = true
            })
          },
        },
      ]

      const executor = new AutoExecutor({
        steps,
        context: {},
        req,
        res,
      })

      await executor.execute()

      expect(userCallbackCalled).toBe(true)
      expect(renderedHtml).toContain('Pug Test')
      expect(res.headersSent).toBe(true)
    })

    it('should handle Pug rendering errors properly', async () => {
      const req: any = {
        method: 'GET',
        url: '/test',
        app,
      }

      const res: any = {
        headersSent: false,
        app,
        render: function (this: any, _view: string, _locals: any, callback?: Function) {
          // Simulate template rendering error
          setImmediate(() => {
            const error = new Error('Template rendering failed')
            if (callback) {
              callback(error)
            }
          })
        },
      }

      const steps: StepInfo[] = [
        {
          number: 100,
          name: '100-render-pug.js',
          path: '/fake/path',
          fn: async (_ctx: any, _req: any, res: any) => {
            res.render('test', { title: 'Test' })
          },
        },
      ]

      const executor = new AutoExecutor({
        steps,
        context: {},
        req,
        res,
      })

      await expect(executor.execute()).rejects.toThrow('Template rendering failed')
    })
  })

  describe('Multiple template engines', () => {
    it('should work with different template engines in sequence', async () => {
      const ejsApp = express()
      ejsApp.set('view engine', 'ejs')
      ejsApp.set('views', path.join(__dirname, 'fixtures', 'views'))

      const pugApp = express()
      pugApp.set('view engine', 'pug')
      pugApp.set('views', path.join(__dirname, 'fixtures', 'views'))

      // Test EJS
      const req1: any = { method: 'GET', url: '/test', app: ejsApp }
      let ejsRendered = ''
      const res1: any = {
        headersSent: false,
        app: ejsApp,
        render: function (this: any, view: string, locals: any, callback?: Function) {
          ejsApp.render(view, locals, (err: Error | null, html?: string) => {
            if (!err) {
              ejsRendered = html || ''
              this.headersSent = true
            }
            if (callback) callback(err, html)
          })
        },
        send: function (this: any, _body: any) {
          this.headersSent = true
          return this
        },
      }

      const steps1: StepInfo[] = [
        {
          number: 100,
          name: '100-render-ejs.js',
          path: '/fake/path',
          fn: async (_ctx: any, _req: any, res: any) => {
            res.render('test', { title: 'EJS', message: 'EJS Test', user: null })
          },
        },
      ]

      const executor1 = new AutoExecutor({ steps: steps1, context: {}, req: req1, res: res1 })
      await executor1.execute()
      expect(ejsRendered).toContain('EJS')

      // Test Pug
      const req2: any = { method: 'GET', url: '/test', app: pugApp }
      let pugRendered = ''
      const res2: any = {
        headersSent: false,
        app: pugApp,
        render: function (this: any, view: string, locals: any, callback?: Function) {
          pugApp.render(view, locals, (err: Error | null, html?: string) => {
            if (!err) {
              pugRendered = html || ''
              this.headersSent = true
            }
            if (callback) callback(err, html)
          })
        },
        send: function (this: any, _body: any) {
          this.headersSent = true
          return this
        },
      }

      const steps2: StepInfo[] = [
        {
          number: 100,
          name: '100-render-pug.js',
          path: '/fake/path',
          fn: async (_ctx: any, _req: any, res: any) => {
            res.render('test', { title: 'Pug', message: 'Pug Test', user: null })
          },
        },
      ]

      const executor2 = new AutoExecutor({ steps: steps2, context: {}, req: req2, res: res2 })
      await executor2.execute()
      expect(pugRendered).toContain('Pug')
    })
  })
})
