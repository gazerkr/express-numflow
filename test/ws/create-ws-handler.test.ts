/**
 * createWsHandler Integration Tests
 *
 * TDD: Tests for WebSocket handler factory function
 *
 * Features:
 * - Handler creation from features directory
 * - Socket connection handling
 * - Event routing to features
 * - Context management per connection
 * - Error handling
 */

import * as fs from 'fs'
import * as path from 'path'
import { createWsHandler } from '../../src/ws/create-ws-handler'
import type { WsHandler } from '../../src/ws/types'

// Mock Socket.io Socket and Server
function createMockSocket(id: string = 'test-socket-123') {
  const eventHandlers = new Map<string, Function[]>()

  const socket: any = {
    id,
    handshake: { query: {} },
    rooms: new Set([id]),

    // Event registration
    on(event: string, handler: Function) {
      const handlers = eventHandlers.get(event) || []
      handlers.push(handler)
      eventHandlers.set(event, handlers)
      return socket
    },

    // Event emission
    emit: jest.fn(),

    // Broadcast
    broadcast: {
      emit: jest.fn(),
    },

    // Room operations
    to: jest.fn(() => ({
      emit: jest.fn(),
    })),
    join: jest.fn(),
    leave: jest.fn(),
    disconnect: jest.fn(),

    // Namespace server reference (used to get io server)
    nsp: {
      server: createMockServer(),
    },

    // Helper for tests: trigger an event
    __trigger(event: string, data: any) {
      const handlers = eventHandlers.get(event) || []
      handlers.forEach((h) => h(data))
    },

    // Helper: get registered events
    __getEvents() {
      return Array.from(eventHandlers.keys())
    },
  }

  return socket
}

function createMockServer() {
  return {
    emit: jest.fn(),
    to: jest.fn(() => ({
      emit: jest.fn(),
    })),
  }
}

describe('createWsHandler', () => {
  const testBaseDir = path.join(__dirname, '__fixtures__', 'ws-handler')

  beforeAll(() => {
    createTestFixtures()
  })

  afterAll(() => {
    removeTestFixtures()
  })

  describe('Handler Creation', () => {
    it('should create handler from features directory', async () => {
      const handler = await createWsHandler(testBaseDir)

      expect(handler).toBeDefined()
      expect(typeof handler).toBe('function')
      expect(typeof handler.handleConnection).toBe('function')
      expect(typeof handler.getContext).toBe('function')
      expect(typeof handler.destroy).toBe('function')

      handler.destroy()
    })

    it('should accept options', async () => {
      const handler = await createWsHandler(testBaseDir, {
        debug: false,
        contextMaxAge: 60000,
        contextCleanupInterval: 10000,
      })

      expect(handler).toBeDefined()
      handler.destroy()
    })

    it('should throw error for non-existent directory', async () => {
      await expect(
        createWsHandler(path.join(__dirname, 'non-existent'))
      ).rejects.toThrow('WebSocket features directory not found')
    })
  })

  describe('Connection Handling', () => {
    let handler: WsHandler

    beforeEach(async () => {
      handler = await createWsHandler(testBaseDir)
    })

    afterEach(() => {
      handler.destroy()
    })

    it('should handle socket connection', () => {
      const socket = createMockSocket()

      expect(() => handler.handleConnection(socket)).not.toThrow()
    })

    it('should create context on connection', async () => {
      const socket = createMockSocket('socket-abc')

      handler.handleConnection(socket)

      // Wait for async connect event execution
      await new Promise((resolve) => setTimeout(resolve, 10))

      const ctx = handler.getContext('socket-abc')
      expect(ctx).toBeDefined()
    })

    it('should register message event handlers', () => {
      const socket = createMockSocket()

      handler.handleConnection(socket)

      // Should register 'chat:send' event from fixtures
      const events = socket.__getEvents()
      expect(events).toContain('chat:send')
      expect(events).toContain('disconnect')
    })

    it('should be callable as function (io.on pattern)', () => {
      const socket = createMockSocket()

      // Should work when called directly
      expect(() => handler(socket)).not.toThrow()
    })
  })

  describe('Event Execution', () => {
    let handler: WsHandler

    beforeEach(async () => {
      handler = await createWsHandler(testBaseDir, { debug: false })
    })

    afterEach(() => {
      handler.destroy()
    })

    it('should execute connect event steps', async () => {
      const socket = createMockSocket()

      handler.handleConnection(socket)

      // Wait for async execution
      await new Promise((resolve) => setTimeout(resolve, 50))

      const ctx = handler.getContext(socket.id)
      expect(ctx?.connected).toBe(true)
    })

    it('should execute message event steps', async () => {
      const socket = createMockSocket()

      handler.handleConnection(socket)
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Trigger chat:send event
      socket.__trigger('chat:send', { message: 'Hello' })
      await new Promise((resolve) => setTimeout(resolve, 50))

      const ctx = handler.getContext(socket.id)
      expect(ctx?.messageSent).toBe(true)
      expect(ctx?.lastMessage).toBe('Hello')
    })

    it('should execute disconnect event steps and cleanup context', async () => {
      const socket = createMockSocket()

      handler.handleConnection(socket)
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Trigger disconnect
      socket.__trigger('disconnect', 'client disconnect')
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Context should be deleted after disconnect
      const ctx = handler.getContext(socket.id)
      expect(ctx).toBeUndefined()
    })
  })

  describe('Context Management', () => {
    let handler: WsHandler

    beforeEach(async () => {
      handler = await createWsHandler(testBaseDir)
    })

    afterEach(() => {
      handler.destroy()
    })

    it('should maintain separate contexts per socket', async () => {
      const socket1 = createMockSocket('socket-1')
      const socket2 = createMockSocket('socket-2')

      handler.handleConnection(socket1)
      handler.handleConnection(socket2)

      await new Promise((resolve) => setTimeout(resolve, 20))

      const ctx1 = handler.getContext('socket-1')
      const ctx2 = handler.getContext('socket-2')

      expect(ctx1).not.toBe(ctx2)
      expect(ctx1?.__socketId).toBe('socket-1')
      expect(ctx2?.__socketId).toBe('socket-2')
    })

    it('should persist context across events', async () => {
      const socket = createMockSocket()

      handler.handleConnection(socket)
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Set value in context via connect event
      const ctx = handler.getContext(socket.id)
      ctx!.customValue = 'test123'

      // Trigger another event
      socket.__trigger('chat:send', { message: 'Hi' })
      await new Promise((resolve) => setTimeout(resolve, 20))

      // Value should persist
      expect(handler.getContext(socket.id)?.customValue).toBe('test123')
    })
  })

  describe('Error Handling', () => {
    it('should use custom onError handler', async () => {
      const errorHandler = jest.fn()

      // Create handler with error throwing feature
      const errorFixtureDir = path.join(testBaseDir, 'error-test')
      fs.mkdirSync(path.join(errorFixtureDir, '@connect', 'steps'), { recursive: true })
      fs.writeFileSync(
        path.join(errorFixtureDir, '@connect', 'steps', '100-throw.js'),
        `module.exports = () => { throw new Error('Test error'); };`
      )

      const handler = await createWsHandler(errorFixtureDir, {
        onError: errorHandler,
      })

      const socket = createMockSocket()
      handler.handleConnection(socket)

      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(errorHandler).toHaveBeenCalled()
      const [error, ctx, trigger, responder] = errorHandler.mock.calls[0]
      expect(error.message).toBe('Test error')
      expect(ctx).toBeDefined()
      expect(trigger).toBeDefined()
      expect(responder).toBeDefined()

      handler.destroy()
    })

    it('should emit error event by default', async () => {
      // Create handler with error throwing feature
      const errorFixtureDir = path.join(testBaseDir, 'error-emit-test')
      fs.mkdirSync(path.join(errorFixtureDir, '@connect', 'steps'), { recursive: true })
      fs.writeFileSync(
        path.join(errorFixtureDir, '@connect', 'steps', '100-throw.js'),
        `module.exports = () => { throw new Error('Default error'); };`
      )

      const handler = await createWsHandler(errorFixtureDir)

      const socket = createMockSocket()
      handler.handleConnection(socket)

      await new Promise((resolve) => setTimeout(resolve, 50))

      // Should emit error event to socket
      expect(socket.emit).toHaveBeenCalledWith('error', { message: 'Default error' })

      handler.destroy()
    })
  })

  describe('Destroy', () => {
    it('should cleanup resources on destroy', async () => {
      const handler = await createWsHandler(testBaseDir)

      const socket = createMockSocket()
      handler.handleConnection(socket)

      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(handler.getContext(socket.id)).toBeDefined()

      handler.destroy()

      // Context should be cleared after destroy
      expect(handler.getContext(socket.id)).toBeUndefined()
    })
  })
})

// ========== Test Fixtures Setup ==========

function createTestFixtures() {
  const testBaseDir = path.join(__dirname, '__fixtures__', 'ws-handler')

  // Clean up if exists
  if (fs.existsSync(testBaseDir)) {
    fs.rmSync(testBaseDir, { recursive: true })
  }

  // Create directory structure:
  // ws-handler/
  //   @connect/
  //     steps/
  //       100-init.js        -> sets ctx.connected = true
  //   @disconnect/
  //     steps/
  //       100-cleanup.js     -> sets ctx.disconnected = true
  //   chat/
  //     send/
  //       @message/
  //         steps/
  //           100-validate.js -> sets ctx.messageSent = true, ctx.lastMessage

  // @connect
  const connectStepsDir = path.join(testBaseDir, '@connect', 'steps')
  fs.mkdirSync(connectStepsDir, { recursive: true })
  fs.writeFileSync(
    path.join(connectStepsDir, '100-init.js'),
    `module.exports = (ctx) => {
      ctx.connected = true;
      ctx.connectedAt = Date.now();
    };`
  )

  // @disconnect
  const disconnectStepsDir = path.join(testBaseDir, '@disconnect', 'steps')
  fs.mkdirSync(disconnectStepsDir, { recursive: true })
  fs.writeFileSync(
    path.join(disconnectStepsDir, '100-cleanup.js'),
    `module.exports = (ctx) => {
      ctx.disconnected = true;
    };`
  )

  // chat/send/@message
  const messageStepsDir = path.join(testBaseDir, 'chat', 'send', '@message', 'steps')
  fs.mkdirSync(messageStepsDir, { recursive: true })
  fs.writeFileSync(
    path.join(messageStepsDir, '100-validate.js'),
    `module.exports = (ctx, trigger) => {
      ctx.messageSent = true;
      ctx.lastMessage = trigger.data.message;
    };`
  )
}

function removeTestFixtures() {
  const testBaseDir = path.join(__dirname, '__fixtures__', 'ws-handler')

  if (fs.existsSync(testBaseDir)) {
    fs.rmSync(testBaseDir, { recursive: true })
  }
}
