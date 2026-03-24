import { AutoExecutor } from '../../src/http/auto-executor'

function createMockReqRes() {
  const req = { method: 'GET', url: '/test' }
  const res = {
    headersSent: false,
    writableEnded: false,
    setHeader: jest.fn(),
    flushHeaders: jest.fn(function (this: any) {
      this.headersSent = true
    }),
    write: jest.fn(),
    end: jest.fn(function (this: any) {
      this.writableEnded = true
      this.headersSent = true
    }),
    statusCode: 200,
  }
  return { req, res }
}

describe('ctx.__streaming', () => {
  it('should continue executing steps after flushHeaders when __streaming is true', async () => {
    const { req, res } = createMockReqRes()
    const step200Called = jest.fn()

    const executor = new AutoExecutor({
      steps: [
        {
          number: 100, name: '100-setup.js', path: '/test/100-setup.js',
          fn: async (ctx: any, _req: any, r: any) => {
            ctx.__streaming = true
            r.flushHeaders()
          },
        },
        {
          number: 200, name: '200-stream.js', path: '/test/200-stream.js',
          fn: async (_ctx: any, _req: any, r: any) => {
            step200Called()
            r.write('data: test\n\n')
            r.end()
          },
        },
      ],
      context: {},
      req: req as any,
      res: res as any,
    })

    await executor.execute()

    expect(step200Called).toHaveBeenCalled()
    expect(res.write).toHaveBeenCalledWith('data: test\n\n')
    expect(res.end).toHaveBeenCalled()
  })

  it('should stop after flushHeaders when __streaming is NOT set (backward compat)', async () => {
    const { req, res } = createMockReqRes()
    const step200Called = jest.fn()

    const executor = new AutoExecutor({
      steps: [
        {
          number: 100, name: '100-setup.js', path: '/test/100-setup.js',
          fn: async (_ctx: any, _req: any, r: any) => {
            r.flushHeaders()
          },
        },
        {
          number: 200, name: '200-noop.js', path: '/test/200-noop.js',
          fn: async () => { step200Called() },
        },
      ],
      context: {},
      req: req as any,
      res: res as any,
    })

    await executor.execute()
    expect(step200Called).not.toHaveBeenCalled()
  })

  it('should warn when streaming mode ends without res.end()', async () => {
    const { req, res } = createMockReqRes()
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation()

    const executor = new AutoExecutor({
      steps: [
        {
          number: 100, name: '100-setup.js', path: '/test/100-setup.js',
          fn: async (ctx: any, _req: any, r: any) => {
            ctx.__streaming = true
            r.flushHeaders()
          },
        },
        {
          number: 200, name: '200-stream.js', path: '/test/200-stream.js',
          fn: async (_ctx: any, _req: any, r: any) => {
            r.write('data: test\n\n')
            // Intentionally NOT calling res.end()
          },
        },
      ],
      context: {},
      req: req as any,
      res: res as any,
    })

    await executor.execute()

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Streaming mode ended without calling res.end()')
    )
    warnSpy.mockRestore()
  })

  it('should guard asyncTracker headersSent check with __streaming', async () => {
    const { req, res } = createMockReqRes()
    const step200Called = jest.fn()

    const executor = new AutoExecutor({
      steps: [
        {
          number: 100, name: '100-setup.js', path: '/test/100-setup.js',
          fn: async (ctx: any, _req: any, r: any) => {
            ctx.__streaming = true
            r.headersSent = true
          },
        },
        {
          number: 200, name: '200-continue.js', path: '/test/200-continue.js',
          fn: async (_ctx: any, _req: any, r: any) => {
            step200Called()
            r.end()
          },
        },
      ],
      context: {},
      req: req as any,
      res: res as any,
    })

    await executor.execute()
    expect(step200Called).toHaveBeenCalled()
  })
})
