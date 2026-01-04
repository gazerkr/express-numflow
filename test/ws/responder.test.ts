/**
 * WsResponder Tests
 *
 * Tests for WebSocket Responder functionality
 */

import { createWsResponder } from '../../src/ws/responder'
import type { WsResponder } from '../../src/ws/types'

// Mock Socket.io Socket
function createMockSocket() {
  const emitted: Array<{ event: string; data: any }> = []
  const broadcastEmitted: Array<{ event: string; data: any }> = []
  const toEmitted: Array<{ room: string; event: string; data: any }> = []
  const joinedRooms: string[] = []
  const leftRooms: string[] = []
  let disconnected = false
  let disconnectClose: boolean | undefined

  const socket: any = {
    emit: jest.fn((event: string, data: any) => {
      emitted.push({ event, data })
    }),
    broadcast: {
      emit: jest.fn((event: string, data: any) => {
        broadcastEmitted.push({ event, data })
      }),
    },
    to: jest.fn((room: string) => ({
      emit: jest.fn((event: string, data: any) => {
        toEmitted.push({ room, event, data })
      }),
    })),
    join: jest.fn((room: string) => {
      joinedRooms.push(room)
    }),
    leave: jest.fn((room: string) => {
      leftRooms.push(room)
    }),
    disconnect: jest.fn((close?: boolean) => {
      disconnected = true
      disconnectClose = close
    }),

    // Test helpers
    __emitted: emitted,
    __broadcastEmitted: broadcastEmitted,
    __toEmitted: toEmitted,
    __joinedRooms: joinedRooms,
    __leftRooms: leftRooms,
    __isDisconnected: () => disconnected,
    __disconnectClose: () => disconnectClose,
  }

  return socket
}

// Mock Socket.io Server
function createMockServer() {
  const emitted: Array<{ event: string; data: any }> = []

  const server: any = {
    emit: jest.fn((event: string, data: any) => {
      emitted.push({ event, data })
    }),

    // Test helpers
    __emitted: emitted,
  }

  return server
}

describe('WsResponder', () => {
  let socket: any
  let io: any
  let responder: WsResponder

  beforeEach(() => {
    socket = createMockSocket()
    io = createMockServer()
    responder = createWsResponder(socket, io)
  })

  describe('emit()', () => {
    it('should emit event to current socket', () => {
      responder.emit('message', { text: 'Hello' })

      expect(socket.emit).toHaveBeenCalledWith('message', { text: 'Hello' })
    })

    it('should emit multiple events', () => {
      responder.emit('event1', { data: 1 })
      responder.emit('event2', { data: 2 })

      expect(socket.emit).toHaveBeenCalledTimes(2)
      expect(socket.__emitted).toHaveLength(2)
    })
  })

  describe('broadcast()', () => {
    it('should broadcast event to all except sender', () => {
      responder.broadcast('announcement', { message: 'Hello everyone' })

      expect(socket.broadcast.emit).toHaveBeenCalledWith('announcement', { message: 'Hello everyone' })
    })
  })

  describe('to()', () => {
    it('should emit to specific room when chained with emit', () => {
      responder.to('room-123').emit('room-message', { text: 'Room only' })

      expect(socket.to).toHaveBeenCalledWith('room-123')
    })

    it('should return responder for chaining', () => {
      const result = responder.to('room-123')

      expect(result).toBe(responder)
    })

    it('should reset room after emit', () => {
      responder.to('room-123').emit('event1', { data: 1 })
      responder.emit('event2', { data: 2 })

      // First call should be to room
      expect(socket.to).toHaveBeenCalledWith('room-123')
      // Second call should be direct emit (not to room)
      expect(socket.emit).toHaveBeenCalledWith('event2', { data: 2 })
    })
  })

  describe('toAll()', () => {
    it('should emit to all sockets including sender', () => {
      responder.toAll('global-event', { global: true })

      expect(io.emit).toHaveBeenCalledWith('global-event', { global: true })
    })
  })

  describe('join()', () => {
    it('should join a room', () => {
      responder.join('chat-room')

      expect(socket.join).toHaveBeenCalledWith('chat-room')
    })

    it('should join multiple rooms', () => {
      responder.join('room1')
      responder.join('room2')

      expect(socket.join).toHaveBeenCalledTimes(2)
      expect(socket.__joinedRooms).toEqual(['room1', 'room2'])
    })
  })

  describe('leave()', () => {
    it('should leave a room', () => {
      responder.leave('chat-room')

      expect(socket.leave).toHaveBeenCalledWith('chat-room')
    })
  })

  describe('disconnect()', () => {
    it('should disconnect the socket', () => {
      responder.disconnect()

      expect(socket.disconnect).toHaveBeenCalled()
      expect(socket.__isDisconnected()).toBe(true)
    })

    it('should disconnect with close option', () => {
      responder.disconnect(true)

      expect(socket.disconnect).toHaveBeenCalledWith(true)
    })
  })

  describe('Complex scenarios', () => {
    it('should handle room messaging workflow', () => {
      // User joins a room
      responder.join('game-123')

      // Broadcast to room that user joined
      responder.to('game-123').emit('user-joined', { userId: 'user-1' })

      // Send direct message to user
      responder.emit('welcome', { message: 'Welcome to the game!' })

      expect(socket.__joinedRooms).toContain('game-123')
      expect(socket.to).toHaveBeenCalledWith('game-123')
      expect(socket.emit).toHaveBeenCalledWith('welcome', { message: 'Welcome to the game!' })
    })

    it('should handle disconnection workflow', () => {
      // User leaves room then disconnects
      responder.leave('chat-room')
      responder.broadcast('user-left', { userId: 'user-1' })
      responder.disconnect()

      expect(socket.__leftRooms).toContain('chat-room')
      expect(socket.broadcast.emit).toHaveBeenCalled()
      expect(socket.__isDisconnected()).toBe(true)
    })
  })
})
