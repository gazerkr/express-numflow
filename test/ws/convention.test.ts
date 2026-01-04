/**
 * WebSocket Convention System Tests
 *
 * TDD: Tests for WebSocket convention-over-configuration
 *
 * Folder structure rules:
 * ws/
 * └── chat/
 *     ├── @connect/           -> 'connect' event
 *     ├── @disconnect/        -> 'disconnect' event
 *     └── send/
 *         └── @message/       -> 'chat:send' event
 */

import { WsConventionResolver } from '../../src/ws/convention'

describe('WebSocket Convention System', () => {
  describe('inferEventType()', () => {
    it('should return "connect" for @connect folder', () => {
      const eventType = WsConventionResolver.inferEventType('@connect')
      expect(eventType).toBe('connect')
    })

    it('should return "disconnect" for @disconnect folder', () => {
      const eventType = WsConventionResolver.inferEventType('@disconnect')
      expect(eventType).toBe('disconnect')
    })

    it('should return "message" for @message folder', () => {
      const eventType = WsConventionResolver.inferEventType('@message')
      expect(eventType).toBe('message')
    })

    it('should return null for non-event folder', () => {
      const eventType = WsConventionResolver.inferEventType('chat')
      expect(eventType).toBeNull()
    })

    it('should return null for folder without @ prefix', () => {
      const eventType = WsConventionResolver.inferEventType('connect')
      expect(eventType).toBeNull()
    })

    it('should return null for invalid event type', () => {
      const eventType = WsConventionResolver.inferEventType('@invalid')
      expect(eventType).toBeNull()
    })

    it('should be case-insensitive', () => {
      expect(WsConventionResolver.inferEventType('@CONNECT')).toBe('connect')
      expect(WsConventionResolver.inferEventType('@Message')).toBe('message')
    })
  })

  describe('isWsEventFolder()', () => {
    it('should return true for @connect', () => {
      expect(WsConventionResolver.isWsEventFolder('@connect')).toBe(true)
    })

    it('should return true for @disconnect', () => {
      expect(WsConventionResolver.isWsEventFolder('@disconnect')).toBe(true)
    })

    it('should return true for @message', () => {
      expect(WsConventionResolver.isWsEventFolder('@message')).toBe(true)
    })

    it('should return false for regular folder', () => {
      expect(WsConventionResolver.isWsEventFolder('chat')).toBe(false)
    })

    it('should return false for HTTP method folders', () => {
      expect(WsConventionResolver.isWsEventFolder('@get')).toBe(false)
      expect(WsConventionResolver.isWsEventFolder('@post')).toBe(false)
    })
  })

  describe('inferEventName()', () => {
    const wsBase = '/ws'

    it('should return "connect" for @connect folder', () => {
      const eventName = WsConventionResolver.inferEventName('/ws/chat/@connect', wsBase)
      expect(eventName).toBe('connect')
    })

    it('should return "disconnect" for @disconnect folder', () => {
      const eventName = WsConventionResolver.inferEventName('/ws/chat/@disconnect', wsBase)
      expect(eventName).toBe('disconnect')
    })

    it('should return path-based event name for @message folder', () => {
      // chat/send/@message -> 'chat:send'
      const eventName = WsConventionResolver.inferEventName('/ws/chat/send/@message', wsBase)
      expect(eventName).toBe('chat:send')
    })

    it('should return single segment event name for @message', () => {
      // chat/@message -> 'chat'
      const eventName = WsConventionResolver.inferEventName('/ws/chat/@message', wsBase)
      expect(eventName).toBe('chat')
    })

    it('should return multi-segment event name with colons', () => {
      // room/join/@message -> 'room:join'
      const eventName = WsConventionResolver.inferEventName('/ws/room/join/@message', wsBase)
      expect(eventName).toBe('room:join')

      // user/status/update/@message -> 'user:status:update'
      const eventName2 = WsConventionResolver.inferEventName('/ws/user/status/update/@message', wsBase)
      expect(eventName2).toBe('user:status:update')
    })

    it('should throw error for invalid event folder', () => {
      expect(() => {
        WsConventionResolver.inferEventName('/ws/chat/invalid', wsBase)
      }).toThrow('Invalid WebSocket event folder')
    })

    it('should throw error for @message without parent path', () => {
      expect(() => {
        WsConventionResolver.inferEventName('/ws/@message', wsBase)
      }).toThrow('@message folder must have a parent path')
    })
  })

  describe('resolveConventions()', () => {
    const wsBase = '/ws'

    it('should resolve connect event conventions', () => {
      const conventions = WsConventionResolver.resolveConventions('/ws/chat/@connect', wsBase)

      expect(conventions.eventName).toBe('connect')
      expect(conventions.eventType).toBe('connect')
    })

    it('should resolve disconnect event conventions', () => {
      const conventions = WsConventionResolver.resolveConventions('/ws/chat/@disconnect', wsBase)

      expect(conventions.eventName).toBe('disconnect')
      expect(conventions.eventType).toBe('disconnect')
    })

    it('should resolve message event conventions', () => {
      const conventions = WsConventionResolver.resolveConventions('/ws/chat/send/@message', wsBase)

      expect(conventions.eventName).toBe('chat:send')
      expect(conventions.eventType).toBe('message')
    })
  })
})
