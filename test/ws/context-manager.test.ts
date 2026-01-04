/**
 * ConnectionContextManager Tests
 *
 * TDD: Tests for WebSocket connection context management
 *
 * Features:
 * - Context creation per socket connection
 * - Context retrieval and update
 * - Context deletion on disconnect
 * - Automatic cleanup of stale contexts
 */

import { ConnectionContextManager } from '../../src/ws/context-manager'

describe('ConnectionContextManager', () => {
  let manager: ConnectionContextManager

  beforeEach(() => {
    manager = new ConnectionContextManager({
      maxAge: 1000, // 1 second for testing
      cleanupInterval: 10000, // long interval to avoid auto cleanup during tests
      debug: false,
    })
  })

  afterEach(() => {
    manager.destroy()
  })

  describe('create()', () => {
    it('should create a new context for a socket ID', () => {
      const socketId = 'socket-123'
      const ctx = manager.create(socketId)

      expect(ctx).toBeDefined()
      expect(ctx.__socketId).toBe(socketId)
      expect(ctx.__createdAt).toBeDefined()
      expect(ctx.__lastActivityAt).toBeDefined()
    })

    it('should create context with initial data', () => {
      const socketId = 'socket-123'
      const ctx = manager.create(socketId, { userId: 'user-1', role: 'admin' })

      expect(ctx.userId).toBe('user-1')
      expect(ctx.role).toBe('admin')
      expect(ctx.__socketId).toBe(socketId)
    })

    it('should increment size after creation', () => {
      expect(manager.size).toBe(0)

      manager.create('socket-1')
      expect(manager.size).toBe(1)

      manager.create('socket-2')
      expect(manager.size).toBe(2)
    })
  })

  describe('get()', () => {
    it('should return existing context', () => {
      const socketId = 'socket-123'
      const created = manager.create(socketId, { name: 'test' })
      const retrieved = manager.get(socketId)

      expect(retrieved).toBe(created)
      expect(retrieved?.name).toBe('test')
    })

    it('should return undefined for non-existent socket', () => {
      const ctx = manager.get('non-existent')
      expect(ctx).toBeUndefined()
    })

    it('should update lastActivityAt on get', async () => {
      const socketId = 'socket-123'
      const ctx = manager.create(socketId)
      const originalActivity = ctx.__lastActivityAt

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10))

      // Get again
      manager.get(socketId)

      expect(ctx.__lastActivityAt).toBeGreaterThan(originalActivity!)
    })
  })

  describe('getOrCreate()', () => {
    it('should return existing context if exists', () => {
      const socketId = 'socket-123'
      const created = manager.create(socketId, { existing: true })
      const retrieved = manager.getOrCreate(socketId, { existing: false })

      expect(retrieved).toBe(created)
      expect(retrieved.existing).toBe(true)
    })

    it('should create new context if not exists', () => {
      const socketId = 'socket-123'
      const ctx = manager.getOrCreate(socketId, { newContext: true })

      expect(ctx.__socketId).toBe(socketId)
      expect(ctx.newContext).toBe(true)
    })
  })

  describe('delete()', () => {
    it('should delete existing context', () => {
      const socketId = 'socket-123'
      manager.create(socketId)

      expect(manager.has(socketId)).toBe(true)

      const deleted = manager.delete(socketId)

      expect(deleted).toBe(true)
      expect(manager.has(socketId)).toBe(false)
    })

    it('should return false for non-existent context', () => {
      const deleted = manager.delete('non-existent')
      expect(deleted).toBe(false)
    })

    it('should decrement size after deletion', () => {
      manager.create('socket-1')
      manager.create('socket-2')
      expect(manager.size).toBe(2)

      manager.delete('socket-1')
      expect(manager.size).toBe(1)
    })
  })

  describe('has()', () => {
    it('should return true for existing context', () => {
      manager.create('socket-123')
      expect(manager.has('socket-123')).toBe(true)
    })

    it('should return false for non-existent context', () => {
      expect(manager.has('non-existent')).toBe(false)
    })
  })

  describe('cleanup()', () => {
    it('should remove expired contexts', async () => {
      // Create context with short maxAge manager
      const shortManager = new ConnectionContextManager({
        maxAge: 50, // 50ms
        cleanupInterval: 100000, // very long to prevent auto cleanup
        debug: false,
      })

      shortManager.create('socket-1')
      shortManager.create('socket-2')

      expect(shortManager.size).toBe(2)

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 60))

      // Manual cleanup
      const cleaned = shortManager.cleanup()

      expect(cleaned).toBe(2)
      expect(shortManager.size).toBe(0)

      shortManager.destroy()
    })

    it('should not remove non-expired contexts', async () => {
      manager.create('socket-1')
      manager.create('socket-2')

      // Immediate cleanup (maxAge is 1000ms, so nothing should be expired)
      const cleaned = manager.cleanup()

      expect(cleaned).toBe(0)
      expect(manager.size).toBe(2)
    })
  })

  describe('destroy()', () => {
    it('should clear all contexts', () => {
      manager.create('socket-1')
      manager.create('socket-2')
      manager.create('socket-3')

      expect(manager.size).toBe(3)

      manager.destroy()

      expect(manager.size).toBe(0)
    })
  })

  describe('getAll()', () => {
    it('should return all contexts', () => {
      manager.create('socket-1', { name: 'ctx1' })
      manager.create('socket-2', { name: 'ctx2' })

      const all = manager.getAll()

      expect(all.size).toBe(2)
      expect(all.get('socket-1')?.name).toBe('ctx1')
      expect(all.get('socket-2')?.name).toBe('ctx2')
    })

    it('should return a copy (not the original)', () => {
      manager.create('socket-1')

      const all = manager.getAll()
      all.delete('socket-1')

      // Original should still have the context
      expect(manager.has('socket-1')).toBe(true)
    })
  })

  describe('Context modification', () => {
    it('should allow modifying context data', () => {
      const ctx = manager.create('socket-123')

      ctx.user = { id: 'user-1', name: 'Alice' }
      ctx.room = 'general'

      const retrieved = manager.get('socket-123')

      expect(retrieved?.user).toEqual({ id: 'user-1', name: 'Alice' })
      expect(retrieved?.room).toBe('general')
    })

    it('should persist modifications across get calls', () => {
      const ctx = manager.create('socket-123')
      ctx.counter = 0

      for (let i = 0; i < 5; i++) {
        const current = manager.get('socket-123')
        current!.counter++
      }

      expect(manager.get('socket-123')?.counter).toBe(5)
    })
  })
})
