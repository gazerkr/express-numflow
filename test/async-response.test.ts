/**
 * Async Response Support Tests
 *
 * Tests for res.render(), res.download(), res.sendFile() support
 */

import { AutoExecutor } from '../src/feature/auto-executor'
import { StepInfo } from '../src/feature/types'

describe('Async Response Support', () => {
  describe('res.render() support', () => {
    it('should support res.render() without callback', async () => {
      const req: any = {
        method: 'GET',
        url: '/test',
      }

      const res: any = {
        headersSent: false,
        render: jest.fn((_view: string, _locals: any, callback?: Function) => {
          // Simulate async rendering
          setImmediate(() => {
            res.headersSent = true
            if (callback) callback(null)
          })
        }),
      }

      const steps: StepInfo[] = [
        {
          number: 100,
          name: '100-render.js',
          path: '/fake/path',
          fn: async (_ctx: any, _req: any, res: any) => {
            res.render('index', { title: 'Test' })
          },
        },
      ]

      const executor = new AutoExecutor({
        steps,
        context: {},
        req,
        res,
      })

      // Should NOT throw error
      await expect(executor.execute()).resolves.not.toThrow()

      // Verify render was called (Proxy adds callback, so just check if called)
      expect(res.render).toHaveBeenCalled()
      expect(res.headersSent).toBe(true)
    })

    it('should support res.render() with callback', async () => {
      const req: any = {
        method: 'GET',
        url: '/test',
      }

      let userCallbackCalled = false
      const res: any = {
        headersSent: false,
        render: jest.fn((_view: string, _locals: any, callback?: Function) => {
          setImmediate(() => {
            res.headersSent = true
            if (callback) callback(null)
          })
        }),
      }

      const steps: StepInfo[] = [
        {
          number: 100,
          name: '100-render.js',
          path: '/fake/path',
          fn: async (_ctx: any, _req: any, res: any) => {
            res.render('index', { title: 'Test' }, (err: any) => {
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
      expect(res.headersSent).toBe(true)
    })

    it('should handle res.render() errors properly', async () => {
      const req: any = {
        method: 'GET',
        url: '/test',
      }

      const renderError = new Error('Template not found')
      const res: any = {
        headersSent: false,
        render: jest.fn((_view: string, _locals: any, callback?: Function) => {
          setImmediate(() => {
            if (callback) callback(renderError)
          })
        }),
      }

      const steps: StepInfo[] = [
        {
          number: 100,
          name: '100-render.js',
          path: '/fake/path',
          fn: async (_ctx: any, _req: any, res: any) => {
            res.render('non-existent', {})
          },
        },
      ]

      const executor = new AutoExecutor({
        steps,
        context: {},
        req,
        res,
      })

      // Should propagate render error
      await expect(executor.execute()).rejects.toThrow('Template not found')
    })
  })

  describe('res.download() support', () => {
    it('should support res.download()', async () => {
      const req: any = {
        method: 'GET',
        url: '/download',
      }

      const res: any = {
        headersSent: false,
        download: jest.fn((_filePath: string, callback?: Function) => {
          setImmediate(() => {
            res.headersSent = true
            if (callback) callback(null)
          })
        }),
      }

      const steps: StepInfo[] = [
        {
          number: 100,
          name: '100-download.js',
          path: '/fake/path',
          fn: async (_ctx: any, _req: any, res: any) => {
            res.download('/path/to/file.pdf')
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
      expect(res.download).toHaveBeenCalled()
      expect(res.headersSent).toBe(true)
    })
  })

  describe('res.sendFile() support', () => {
    it('should support res.sendFile()', async () => {
      const req: any = {
        method: 'GET',
        url: '/file',
      }

      const res: any = {
        headersSent: false,
        sendFile: jest.fn((_filePath: string, callback?: Function) => {
          setImmediate(() => {
            res.headersSent = true
            if (callback) callback(null)
          })
        }),
      }

      const steps: StepInfo[] = [
        {
          number: 100,
          name: '100-sendfile.js',
          path: '/fake/path',
          fn: async (_ctx: any, _req: any, res: any) => {
            res.sendFile('/path/to/file.html')
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
      expect(res.sendFile).toHaveBeenCalled()
      expect(res.headersSent).toBe(true)
    })
  })

  describe('res.redirect() support (synchronous)', () => {
    it('should support res.redirect() without waiting', async () => {
      const req: any = {
        method: 'GET',
        url: '/redirect',
      }

      const res: any = {
        headersSent: false,
        statusCode: 200,
        redirect: jest.fn((_url: string) => {
          // res.redirect() is synchronous - immediately sets headers
          res.statusCode = 302
          res.headersSent = true
        }),
      }

      const steps: StepInfo[] = [
        {
          number: 100,
          name: '100-redirect.js',
          path: '/fake/path',
          fn: async (_ctx: any, _req: any, res: any) => {
            res.redirect('/login')
          },
        },
      ]

      const executor = new AutoExecutor({
        steps,
        context: {},
        req,
        res,
      })

      const startTime = Date.now()
      await executor.execute()
      const duration = Date.now() - startTime

      // Should be fast (no waiting) - redirect is synchronous
      expect(duration).toBeLessThan(100)
      expect(res.redirect).toHaveBeenCalled()
      expect(res.headersSent).toBe(true)
    })
  })

  describe('Synchronous response methods (no waiting)', () => {
    it('should not wait for res.json()', async () => {
      const req: any = {
        method: 'GET',
        url: '/json',
      }

      const res: any = {
        headersSent: false,
        json: jest.fn((_data: any) => {
          res.headersSent = true // Synchronous
        }),
      }

      const steps: StepInfo[] = [
        {
          number: 100,
          name: '100-json.js',
          path: '/fake/path',
          fn: async (_ctx: any, _req: any, res: any) => {
            res.json({ success: true })
          },
        },
      ]

      const executor = new AutoExecutor({
        steps,
        context: {},
        req,
        res,
      })

      const startTime = Date.now()
      await executor.execute()
      const duration = Date.now() - startTime

      // Should be fast (no waiting)
      expect(duration).toBeLessThan(100)
      expect(res.json).toHaveBeenCalledWith({ success: true })
      expect(res.headersSent).toBe(true)
    })

    it('should not wait for res.send()', async () => {
      const req: any = {
        method: 'GET',
        url: '/send',
      }

      const res: any = {
        headersSent: false,
        send: jest.fn((_data: any) => {
          res.headersSent = true // Synchronous
        }),
      }

      const steps: StepInfo[] = [
        {
          number: 100,
          name: '100-send.js',
          path: '/fake/path',
          fn: async (_ctx: any, _req: any, res: any) => {
            res.send('Hello')
          },
        },
      ]

      const executor = new AutoExecutor({
        steps,
        context: {},
        req,
        res,
      })

      const startTime = Date.now()
      await executor.execute()
      const duration = Date.now() - startTime

      // Should be fast (no waiting)
      expect(duration).toBeLessThan(100)
      expect(res.send).toHaveBeenCalledWith('Hello')
      expect(res.headersSent).toBe(true)
    })
  })

  describe('Error cases', () => {
    it('should still throw error if no response sent', async () => {
      const req: any = {
        method: 'GET',
        url: '/test',
      }

      const res: any = {
        headersSent: false,
      }

      const steps: StepInfo[] = [
        {
          number: 100,
          name: '100-noop.js',
          path: '/fake/path',
          fn: async (_ctx: any, _req: any, _res: any) => {
            // Do nothing - no response sent
          },
        },
      ]

      const executor = new AutoExecutor({
        steps,
        context: {},
        req,
        res,
      })

      await expect(executor.execute()).rejects.toThrow(
        'Feature completed without sending a response'
      )
    })
  })
})
