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

  describe('Multiple steps with async response (Critical Bug Fix)', () => {
    it('should wait for async response before executing next step', async () => {
      let renderCompleted = false
      let redirectCalled = false

      const req: any = {
        method: 'GET',
        url: '/test',
      }

      const res: any = {
        headersSent: false,
        render: jest.fn(function (this: any, _view: string, _locals: any, callback?: Function) {
          // Simulate async rendering (takes 50ms)
          setImmediate(() => {
            setTimeout(() => {
              renderCompleted = true
              this.headersSent = true
              if (callback) callback(null, '<html>Rendered</html>')
            }, 50)
          })
        }),
        redirect: jest.fn(function (this: any, _url: string) {
          redirectCalled = true
          if (this.headersSent) {
            throw new Error('Cannot set headers after they are sent to the client')
          }
          this.headersSent = true
        }),
        send: jest.fn(function (this: any, _body: any) {
          this.headersSent = true
          return this
        }),
      }

      const steps: StepInfo[] = [
        {
          number: 200,
          name: '200-render.js',
          path: '/fake/path',
          fn: async (_ctx: any, _req: any, res: any) => {
            // Step 200: res.render() starts async rendering
            res.render('index', { title: 'Test' })
            // Function returns immediately (before rendering completes)
          },
        },
        {
          number: 300,
          name: '300-redirect.js',
          path: '/fake/path',
          fn: async (_ctx: any, _req: any, res: any) => {
            // Step 300: Should NOT execute because Step 200 already sent response
            res.redirect('/dashboard')
          },
        },
      ]

      const executor = new AutoExecutor({
        steps,
        context: {},
        req,
        res,
      })

      // Should complete without error
      await expect(executor.execute()).resolves.not.toThrow()

      // Verify: render completed
      expect(renderCompleted).toBe(true)
      expect(res.render).toHaveBeenCalled()

      // Verify: redirect was NOT called (because response already sent)
      expect(redirectCalled).toBe(false)
      expect(res.redirect).not.toHaveBeenCalled()

      // Verify: response was sent
      expect(res.headersSent).toBe(true)
    })

    it('should handle res.render() followed by res.json() without error', async () => {
      const req: any = {
        method: 'GET',
        url: '/test',
      }

      const res: any = {
        headersSent: false,
        render: jest.fn(function (this: any, _view: string, _locals: any, callback?: Function) {
          setImmediate(() => {
            this.headersSent = true
            if (callback) callback(null, '<html>Rendered</html>')
          })
        }),
        json: jest.fn(function (this: any, _data: any) {
          if (this.headersSent) {
            throw new Error('Cannot set headers after they are sent to the client')
          }
          this.headersSent = true
        }),
        send: jest.fn(function (this: any, _body: any) {
          this.headersSent = true
          return this
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
        {
          number: 200,
          name: '200-json.js',
          path: '/fake/path',
          fn: async (_ctx: any, _req: any, res: any) => {
            res.json({ status: 'ok' })
          },
        },
      ]

      const executor = new AutoExecutor({
        steps,
        context: {},
        req,
        res,
      })

      // Should complete without error
      await expect(executor.execute()).resolves.not.toThrow()

      // Verify: only render was called, json was NOT called
      expect(res.render).toHaveBeenCalled()
      expect(res.json).not.toHaveBeenCalled()
    })

    it('should handle res.download() followed by res.send() without error', async () => {
      const req: any = {
        method: 'GET',
        url: '/test',
      }

      const res: any = {
        headersSent: false,
        download: jest.fn(function (this: any, _filePath: string, callback?: Function) {
          setImmediate(() => {
            setTimeout(() => {
              this.headersSent = true
              if (callback) callback(null)
            }, 30)
          })
        }),
        send: jest.fn(function (this: any, _body: any) {
          if (this.headersSent) {
            throw new Error('Cannot set headers after they are sent to the client')
          }
          this.headersSent = true
          return this
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
        {
          number: 200,
          name: '200-send.js',
          path: '/fake/path',
          fn: async (_ctx: any, _req: any, res: any) => {
            res.send('Download complete')
          },
        },
      ]

      const executor = new AutoExecutor({
        steps,
        context: {},
        req,
        res,
      })

      // Should complete without error
      await expect(executor.execute()).resolves.not.toThrow()

      // Verify: only download was called, send was NOT called
      expect(res.download).toHaveBeenCalled()
      expect(res.send).not.toHaveBeenCalled()
    })
  })

  describe('res.render() in catch block (Prisma error case)', () => {
    it('should handle res.render() in catch block and not execute next step', async () => {
      let nextStepExecuted = false

      const req: any = {
        method: 'POST',
        url: '/admin/tags',
      }

      const res: any = {
        headersSent: false,
        status: jest.fn(function (this: any, _code: number) {
          return this
        }),
        render: jest.fn(function (this: any, _view: string, _locals: any, callback?: Function) {
          setImmediate(() => {
            setTimeout(() => {
              this.headersSent = true
              if (callback) callback(null, '<html>Error</html>')
            }, 50)
          })
        }),
        send: jest.fn(function (this: any, _body: any) {
          this.headersSent = true
          return this
        }),
        json: jest.fn(function (this: any, _data: any) {
          if (this.headersSent) {
            throw new Error('Cannot set headers after they are sent to the client')
          }
          this.headersSent = true
        }),
      }

      const steps: StepInfo[] = [
        {
          number: 100,
          name: '100-create-tag.js',
          path: '/fake/path',
          fn: async (_ctx: any, _req: any, res: any) => {
            try {
              // Simulate Prisma unique constraint error
              const error: any = new Error('Unique constraint failed')
              error.code = 'P2002'
              throw error
            } catch (error: any) {
              if (error.code === 'P2002') {
                // This is the critical case: res.render() in catch block
                return res.status(400).render('error', { message: 'Tag already exists' })
              }
              throw error
            }
          },
        },
        {
          number: 200,
          name: '200-next-step.js',
          path: '/fake/path',
          fn: async (_ctx: any, _req: any, res: any) => {
            // This step should NOT execute because Step 100 already sent response
            nextStepExecuted = true
            res.json({ status: 'ok' })
          },
        },
      ]

      const executor = new AutoExecutor({
        steps,
        context: {},
        req,
        res,
      })

      // Should complete without error
      await expect(executor.execute()).resolves.not.toThrow()

      // Verify: res.status() was called
      expect(res.status).toHaveBeenCalledWith(400)

      // Verify: res.render() was called (Proxy adds callback, so we check with expect.any(Function))
      expect(res.render).toHaveBeenCalledWith('error', { message: 'Tag already exists' }, expect.any(Function))

      // Verify: next step was NOT executed
      expect(nextStepExecuted).toBe(false)
      expect(res.json).not.toHaveBeenCalled()

      // Verify: response was sent
      expect(res.headersSent).toBe(true)
    })

    it('should handle res.render() in catch block followed by res.redirect() without error', async () => {
      const req: any = {
        method: 'POST',
        url: '/test',
      }

      const res: any = {
        headersSent: false,
        status: jest.fn(function (this: any, _code: number) {
          return this
        }),
        render: jest.fn(function (this: any, _view: string, _locals: any, callback?: Function) {
          setImmediate(() => {
            this.headersSent = true
            if (callback) callback(null, '<html>Error</html>')
          })
        }),
        redirect: jest.fn(function (this: any, _url: string) {
          if (this.headersSent) {
            throw new Error('Cannot set headers after they are sent to the client')
          }
          this.headersSent = true
        }),
        send: jest.fn(function (this: any, _body: any) {
          this.headersSent = true
          return this
        }),
      }

      const steps: StepInfo[] = [
        {
          number: 100,
          name: '100-error-handler.js',
          path: '/fake/path',
          fn: async (_ctx: any, _req: any, res: any) => {
            try {
              throw new Error('Some error')
            } catch (error) {
              return res.status(500).render('error', { message: 'Internal error' })
            }
          },
        },
        {
          number: 200,
          name: '200-redirect.js',
          path: '/fake/path',
          fn: async (_ctx: any, _req: any, res: any) => {
            res.redirect('/dashboard')
          },
        },
      ]

      const executor = new AutoExecutor({
        steps,
        context: {},
        req,
        res,
      })

      // Should complete without error
      await expect(executor.execute()).resolves.not.toThrow()

      // Verify: only render was called, redirect was NOT called
      expect(res.render).toHaveBeenCalled()
      expect(res.redirect).not.toHaveBeenCalled()
    })

    it('should handle multiple catch blocks with res.render() correctly', async () => {
      const req: any = {
        method: 'POST',
        url: '/test',
      }

      const res: any = {
        headersSent: false,
        status: jest.fn(function (this: any, _code: number) {
          return this
        }),
        render: jest.fn(function (this: any, _view: string, _locals: any, callback?: Function) {
          setImmediate(() => {
            this.headersSent = true
            if (callback) callback(null, '<html>Error</html>')
          })
        }),
        send: jest.fn(function (this: any, _body: any) {
          this.headersSent = true
          return this
        }),
      }

      let step1Executed = false
      let step2Executed = false
      let step3Executed = false

      const steps: StepInfo[] = [
        {
          number: 100,
          name: '100-validation.js',
          path: '/fake/path',
          fn: async (_ctx: any, _req: any, _res: any) => {
            step1Executed = true
            // Step 1: Validation passes
          },
        },
        {
          number: 200,
          name: '200-db-operation.js',
          path: '/fake/path',
          fn: async (_ctx: any, _req: any, res: any) => {
            step2Executed = true
            try {
              // Simulate DB error
              throw new Error('DB Error')
            } catch (error) {
              return res.status(500).render('error', { message: 'DB failed' })
            }
          },
        },
        {
          number: 300,
          name: '300-success.js',
          path: '/fake/path',
          fn: async (_ctx: any, _req: any, res: any) => {
            step3Executed = true
            res.send('Success')
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

      // Verify execution order
      expect(step1Executed).toBe(true)
      expect(step2Executed).toBe(true)
      expect(step3Executed).toBe(false)  // Should NOT execute

      // Verify render was called
      expect(res.render).toHaveBeenCalled()

      // Note: res.send() is called by Proxy to send rendered HTML (expected behavior)
      expect(res.send).toHaveBeenCalledWith('<html>Error</html>')
    })
  })
})
