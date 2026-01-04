/**
 * WebSocket Responder
 *
 * Interface for sending responses to clients from Step functions
 * Wraps Socket.io's emit, broadcast, to, join, leave
 */

import type { Socket, Server } from 'socket.io'
import type { WsResponder } from './types'

/**
 * Create WebSocket Responder
 *
 * @param socket - Socket.io socket object
 * @param io - Socket.io server object
 * @returns WsResponder interface
 */
export function createWsResponder(socket: Socket, io: Server): WsResponder {
  // Track current room for to() chaining
  let currentRoom: string | null = null

  const responder: WsResponder = {
    /**
     * Emit event to current socket
     */
    emit(event: string, data: any): void {
      if (currentRoom) {
        // If to() chain is set, emit to that room (excluding self)
        socket.to(currentRoom).emit(event, data)
        currentRoom = null
      } else {
        // Default: emit only to current socket
        socket.emit(event, data)
      }
    },

    /**
     * Broadcast to all sockets except self
     */
    broadcast(event: string, data: any): void {
      socket.broadcast.emit(event, data)
    },

    /**
     * Specify target room (for chaining)
     */
    to(room: string): WsResponder {
      currentRoom = room
      return responder
    },

    /**
     * Emit event to all sockets (including self)
     */
    toAll(event: string, data: any): void {
      io.emit(event, data)
    },

    /**
     * Join a room
     */
    join(room: string): void {
      socket.join(room)
    },

    /**
     * Leave a room
     */
    leave(room: string): void {
      socket.leave(room)
    },

    /**
     * Disconnect
     */
    disconnect(close?: boolean): void {
      socket.disconnect(close)
    },
  }

  return responder
}
