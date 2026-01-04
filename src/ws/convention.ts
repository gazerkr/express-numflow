/**
 * WebSocket Convention Resolver
 *
 * Infers WebSocket event configuration from folder structure
 *
 * Folder structure rules:
 * ws/
 * └── chat/
 *     ├── @connect/             -> 'connect' event (connection)
 *     ├── @disconnect/          -> 'disconnect' event (disconnection)
 *     └── send/
 *         └── @message/         -> 'chat:send' event
 *
 * Event name conversion:
 * chat/@connect/                -> 'connect'
 * chat/@disconnect/             -> 'disconnect'
 * chat/send/@message/           -> 'chat:send'
 * room/join/@message/           -> 'room:join'
 */

import * as path from 'path'
import * as fs from 'fs'
import type { WsEventType } from './types'

/**
 * WebSocket event folder mapping
 */
const WS_EVENT_MAP: Record<string, WsEventType> = {
  'connect': 'connect',
  'disconnect': 'disconnect',
  'message': 'message',
}

/**
 * WebSocket Convention Resolver class
 */
export class WsConventionResolver {
  /**
   * Infer event type from folder name
   *
   * @param dirName - Folder name (e.g., '@connect', '@message')
   * @returns Event type or null
   *
   * @example
   * inferEventType('@connect')    // -> 'connect'
   * inferEventType('@disconnect') // -> 'disconnect'
   * inferEventType('@message')    // -> 'message'
   * inferEventType('chat')        // -> null
   */
  static inferEventType(dirName: string): WsEventType | null {
    if (!dirName.startsWith('@')) {
      return null
    }

    const eventName = dirName.substring(1).toLowerCase()
    return WS_EVENT_MAP[eventName] || null
  }

  /**
   * Check if folder is a WebSocket event folder
   *
   * @param dirName - Folder name
   * @returns Whether it is a WebSocket event folder
   */
  static isWsEventFolder(dirName: string): boolean {
    return this.inferEventType(dirName) !== null
  }

  /**
   * Infer event name from folder path
   *
   * @param dirPath - Feature directory path
   * @param wsBase - WebSocket features base directory
   * @returns Event name (e.g., 'chat:send')
   *
   * @example
   * inferEventName('/ws/chat/@connect', '/ws')
   * // -> 'connect'
   *
   * inferEventName('/ws/chat/send/@message', '/ws')
   * // -> 'chat:send'
   *
   * inferEventName('/ws/room/join/@message', '/ws')
   * // -> 'room:join'
   */
  static inferEventName(dirPath: string, wsBase: string): string {
    const relativePath = path.relative(wsBase, dirPath)
    const segments = relativePath.split(path.sep)

    // Last segment is one of @connect, @disconnect, @message
    const lastSegment = segments[segments.length - 1]
    const eventType = this.inferEventType(lastSegment)

    if (!eventType) {
      throw new Error(`Invalid WebSocket event folder: ${lastSegment}`)
    }

    // Return connect, disconnect as-is
    if (eventType === 'connect' || eventType === 'disconnect') {
      return eventType
    }

    // For @message, use parent path as event name
    // chat/send/@message -> 'chat:send'
    const pathSegments = segments.slice(0, -1) // Exclude @message
    if (pathSegments.length === 0) {
      throw new Error(
        `@message folder must have a parent path for event name. ` +
        `Example: chat/send/@message -> 'chat:send'`
      )
    }

    return pathSegments.join(':')
  }

  /**
   * Find Steps folder path
   *
   * @param featureDir - Feature directory path
   * @returns Relative path to steps folder or null
   */
  static findStepsDir(featureDir: string): string | null {
    const stepsDir = path.join(featureDir, 'steps')

    if (fs.existsSync(stepsDir) && fs.statSync(stepsDir).isDirectory()) {
      return './steps'
    }

    return null
  }

  /**
   * Find Async Tasks folder path
   *
   * @param featureDir - Feature directory path
   * @returns Relative path to async-tasks folder or null
   */
  static findAsyncTasksDir(featureDir: string): string | null {
    const asyncTasksDir = path.join(featureDir, 'async-tasks')

    if (fs.existsSync(asyncTasksDir) && fs.statSync(asyncTasksDir).isDirectory()) {
      return './async-tasks'
    }

    return null
  }

  /**
   * Resolve complete conventions
   *
   * @param featureDir - Feature directory path
   * @param wsBase - WebSocket features base directory
   * @returns Resolved configuration
   */
  static resolveConventions(featureDir: string, wsBase: string): {
    eventName: string
    eventType: WsEventType
    steps: string | null
    asyncTasks: string | null
  } {
    const dirName = path.basename(featureDir)
    const eventType = this.inferEventType(dirName)

    if (!eventType) {
      throw new Error(`Invalid WebSocket event folder: ${dirName}`)
    }

    return {
      eventName: this.inferEventName(featureDir, wsBase),
      eventType,
      steps: this.findStepsDir(featureDir),
      asyncTasks: this.findAsyncTasksDir(featureDir),
    }
  }
}
