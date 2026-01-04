/**
 * createWsHandler
 *
 * WebSocket Feature Handler factory function
 *
 * Usage example:
 * ```javascript
 * const io = new Server(server)
 * const wsHandler = await createWsHandler('./ws', { debug: true })
 *
 * io.on('connection', wsHandler)
 * // or
 * io.on('connection', (socket) => wsHandler.handleConnection(socket))
 * ```
 */

import type { Socket, Server } from 'socket.io'
import type {
  WsHandler,
  WsContext,
  WsTrigger,
  CreateWsHandlerOptions,
  ScannedWsFeature,
} from './types'
import { executeSteps } from '../core/executor'
import { ConnectionContextManager } from './context-manager'
import { scanWsFeatures } from './scanner'
import { createWsResponder } from './responder'

/**
 * Create WebSocket Feature Handler
 *
 * @param featuresDir - WebSocket features directory path
 * @param options - Options
 * @returns WsHandler
 */
export async function createWsHandler(
  featuresDir: string,
  options?: CreateWsHandlerOptions
): Promise<WsHandler> {
  const opts = {
    debug: options?.debug ?? false,
    excludeDirs: options?.excludeDirs ?? ['node_modules', '.git', 'dist', 'build'],
    contextMaxAge: options?.contextMaxAge ?? 24 * 60 * 60 * 1000,
    contextCleanupInterval: options?.contextCleanupInterval ?? 60 * 1000,
    onError: options?.onError,
  }

  // Scan Features
  const features = await scanWsFeatures(featuresDir, {
    debug: opts.debug,
    excludeDirs: opts.excludeDirs,
  })

  // Create Feature Map (event name -> Feature)
  const featureMap = new Map<string, ScannedWsFeature>()
  for (const feature of features) {
    featureMap.set(feature.event, feature)
    log(`Registered: ${feature.event} (${feature.eventType})`, opts.debug)
  }

  // Create Context Manager
  const contextManager = new ConnectionContextManager({
    maxAge: opts.contextMaxAge,
    cleanupInterval: opts.contextCleanupInterval,
    debug: opts.debug,
  })

  // Socket.io Server reference (set in handleConnection)
  let ioServer: Server | null = null

  /**
   * Execute event
   */
  async function executeEvent(
    socket: Socket,
    eventName: string,
    data: any
  ): Promise<void> {
    const feature = featureMap.get(eventName)
    if (!feature) {
      log(`No handler for event: ${eventName}`, opts.debug)
      return
    }

    // Get or create Context
    let ctx: WsContext
    if (feature.eventType === 'connect') {
      ctx = contextManager.create(socket.id)
    } else {
      ctx = contextManager.getOrCreate(socket.id)
    }

    // Create Trigger
    const trigger: WsTrigger = {
      type: 'ws',
      event: feature.eventType,
      eventName,
      data,
      socket,
      io: ioServer!,
    }

    // Create Responder
    const responder = createWsResponder(socket, ioServer!)

    try {
      // Execute contextInitializer (if exists)
      if (feature.config?.contextInitializer) {
        await feature.config.contextInitializer(ctx, trigger)
      }

      // Execute Steps
      if (feature.steps.length > 0) {
        await executeSteps({
          steps: feature.steps,
          context: ctx,
          trigger,
          responder,
          logHeader: `[WS ${eventName}]`,
          debug: opts.debug,
        })
      }

      // Execute Async Tasks (background)
      if (feature.asyncTasks.length > 0) {
        setImmediate(async () => {
          for (const task of feature.asyncTasks) {
            try {
              await task.fn(ctx)
            } catch (error) {
              console.error(`[WS AsyncTask] ${task.name} failed:`, error)
            }
          }
        })
      }

      // Delete Context after disconnect event
      if (feature.eventType === 'disconnect') {
        contextManager.delete(socket.id)
      }
    } catch (error) {
      // Error handling
      const err = error as Error
      log(`Error in ${eventName}: ${err.message}`, opts.debug)

      // Feature-specific onError
      if (feature.config?.onError) {
        await feature.config.onError(err, ctx, trigger, responder)
      }
      // Global onError
      else if (opts.onError) {
        await opts.onError(err, ctx, trigger, responder)
      }
      // Default: send error to client
      else {
        responder.emit('error', { message: err.message })
      }
    }
  }

  /**
   * Handle Socket connection
   */
  function handleConnection(socket: Socket): void {
    // Store Socket.io Server reference
    if (!ioServer) {
      // @ts-ignore - Socket.io internal structure
      ioServer = socket.nsp.server
    }

    log(`Connection: ${socket.id}`, opts.debug)

    // Execute connect event
    const connectFeature = featureMap.get('connect')
    if (connectFeature) {
      executeEvent(socket, 'connect', {})
    }

    // Register all @message events
    for (const [eventName, feature] of featureMap) {
      if (feature.eventType === 'message') {
        socket.on(eventName, (data: any) => {
          executeEvent(socket, eventName, data)
        })
      }
    }

    // Register disconnect event
    socket.on('disconnect', (reason: string) => {
      log(`Disconnect: ${socket.id} (${reason})`, opts.debug)
      executeEvent(socket, 'disconnect', { reason })
    })
  }

  // Create WsHandler object
  const handler = handleConnection as WsHandler

  handler.handleConnection = handleConnection

  handler.handleEvent = async (_socketId: string, _event: string, _data: any): Promise<void> => {
    // For testing: execute event with virtual socket
    throw new Error('handleEvent is for testing purposes only')
  }

  handler.getContext = (socketId: string): WsContext | undefined => {
    return contextManager.get(socketId)
  }

  handler.destroy = (): void => {
    contextManager.destroy()
    log('WsHandler destroyed', opts.debug)
  }

  log(`WebSocket handler created with ${features.length} features`, opts.debug)

  return handler
}

/**
 * Debug log
 */
function log(message: string, debug: boolean): void {
  if (debug) {
    console.log(`[WsHandler] ${message}`)
  }
}
