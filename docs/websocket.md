# WebSocket Support

> Feature-First architecture for Socket.io WebSocket applications

express-numflow extends its Convention over Configuration philosophy to WebSocket applications using Socket.io. Just like HTTP routes, WebSocket events can be organized by folder structure.

---

## Quick Start

```javascript
const express = require('express')
const { createServer } = require('http')
const { Server } = require('socket.io')
const { createWsHandler } = require('express-numflow')

const app = express()
const server = createServer(app)
const io = new Server(server)

// Create WebSocket handler from folder structure
const wsHandler = await createWsHandler('./ws')

// Connect to Socket.io
io.on('connection', wsHandler)

server.listen(3000)
```

---

## Convention over Configuration

### Folder Structure = WebSocket Events

```
ws/
  chat/
    @connect/                  <- 'connect' event (connection)
      steps/
        100-authenticate.js
        200-join-default-room.js
    @disconnect/               <- 'disconnect' event (disconnection)
      steps/
        100-cleanup.js
    send/
      @message/                <- 'chat:send' event
        steps/
          100-validate.js
          200-broadcast.js
        async-tasks/
          save-to-db.js
    join/
      @message/                <- 'chat:join' event
        steps/
          100-join-room.js
```

### Event Types

Use `@` prefix to define event types:

| Folder | Event Type | Description |
|--------|------------|-------------|
| `@connect` | Connection | Runs when client connects |
| `@disconnect` | Disconnection | Runs when client disconnects |
| `@message` | Custom Message | Custom event from client |

### Event Name Inference

The folder path becomes the event name:

```
chat/send/@message/      -> 'chat:send' event
chat/join/@message/      -> 'chat:join' event
room/create/@message/    -> 'room:create' event
user/typing/@message/    -> 'user:typing' event
```

> Note: `@connect` and `@disconnect` always resolve to 'connect' and 'disconnect' respectively.

---

## Steps (Sequential Execution)

Steps are executed in numeric order, just like HTTP features. Both `.js` and `.ts` step files are supported (TypeScript natively via jiti).

```javascript
// ws/chat/send/@message/steps/100-validate.js
module.exports = async (ctx, trigger, responder) => {
  if (!trigger.data.message) {
    throw new Error('Message is required')
  }
  ctx.message = trigger.data.message
}
```

```javascript
// ws/chat/send/@message/steps/200-broadcast.js
module.exports = async (ctx, trigger, responder) => {
  // Broadcast to all clients in the room
  responder.to(ctx.room).emit('chat:message', {
    user: ctx.userId,
    message: ctx.message,
    timestamp: Date.now()
  })

  // Confirm to sender
  responder.emit('chat:sent', { success: true })
}
```

**Flow**: 100 -> 200 (automatic!)

---

## Step Parameters

Each step receives three parameters:

### 1. Context (`ctx`)

Context persists for the lifetime of the connection:

```javascript
// ws/chat/@connect/steps/100-authenticate.js
module.exports = async (ctx, trigger, responder) => {
  // Set user info on connection
  ctx.userId = trigger.socket.handshake.auth.userId
  ctx.username = await getUserName(ctx.userId)
  ctx.room = 'general'
}

// ws/chat/send/@message/steps/200-broadcast.js
module.exports = async (ctx, trigger, responder) => {
  // ctx.userId and ctx.username are still available!
  responder.to(ctx.room).emit('message', {
    user: ctx.username,
    text: ctx.message
  })
}
```

### 2. Trigger (`trigger`)

Contains event information:

```typescript
interface WsTrigger {
  type: 'ws'              // Always 'ws'
  event: WsEventType      // 'connect' | 'disconnect' | 'message'
  eventName: string       // e.g., 'chat:send'
  data: any               // Data sent by client
  socket: Socket          // Socket.io socket object
  io: Server              // Socket.io server object
}
```

### 3. Responder (`responder`)

Helper for sending responses:

```typescript
interface WsResponder {
  // Emit to current socket
  emit(event: string, data: any): void

  // Broadcast to all except self
  broadcast(event: string, data: any): void

  // Emit to specific room (excluding self)
  to(room: string): WsResponder

  // Emit to all (including self)
  toAll(event: string, data: any): void

  // Join a room
  join(room: string): void

  // Leave a room
  leave(room: string): void

  // Disconnect
  disconnect(close?: boolean): void
}
```

**Example:**

```javascript
module.exports = async (ctx, trigger, responder) => {
  // Send to self
  responder.emit('notification', { text: 'Welcome!' })

  // Broadcast to everyone except self
  responder.broadcast('user:joined', { userId: ctx.userId })

  // Send to specific room
  responder.to('admins').emit('alert', { message: 'New user' })

  // Send to everyone including self
  responder.toAll('system', { text: 'Server announcement' })

  // Room management
  responder.join('vip-room')
  responder.leave('general')
}
```

---

## Async Tasks

Background tasks that run after the response:

```javascript
// ws/chat/send/@message/async-tasks/save-to-db.js
module.exports = async (ctx) => {
  await db.messages.create({
    userId: ctx.userId,
    message: ctx.message,
    room: ctx.room,
    createdAt: new Date()
  })
}
```

```javascript
// ws/chat/send/@message/async-tasks/notify-mentions.js
module.exports = async (ctx) => {
  const mentions = extractMentions(ctx.message)
  for (const userId of mentions) {
    await sendPushNotification(userId, `${ctx.username} mentioned you`)
  }
}
```

---

## Feature Configuration

Optional `index.js` for advanced configuration:

```javascript
// ws/chat/@connect/index.js
const { wsFeature } = require('express-numflow')

module.exports = wsFeature({
  // Context initialization
  contextInitializer: async (ctx, trigger) => {
    ctx.userId = trigger.socket.handshake.auth.userId
    ctx.connectedAt = Date.now()
  },

  // Error handling
  onError: async (error, ctx, trigger, responder) => {
    console.error(`[WS Error] ${error.message}`)
    responder.emit('error', {
      message: error.message,
      code: error.code || 'UNKNOWN_ERROR'
    })
  }
})
```

---

## API Reference

### `createWsHandler(featuresDir, options?)`

Creates a WebSocket handler from features directory.

**Parameters:**

- `featuresDir` (string): Path to WebSocket features directory
- `options` (object, optional):
  - `debug` (boolean): Enable debug logging (default: `false`)
  - `excludeDirs` (string[]): Directories to exclude (default: `['node_modules', '.git', 'dist', 'build']`)
  - `contextMaxAge` (number): Context maximum retention time in ms (default: `86400000` / 24 hours)
  - `contextCleanupInterval` (number): Context cleanup interval in ms (default: `60000` / 1 minute)
  - `onError` (function): Global error handler

**Returns:** `Promise<WsHandler>`

**Example:**

```javascript
const wsHandler = await createWsHandler('./ws', {
  debug: true,
  contextMaxAge: 12 * 60 * 60 * 1000, // 12 hours
  onError: async (error, ctx, trigger, responder) => {
    console.error(`[WS Error] ${error.message}`)
    responder.emit('error', { message: 'An error occurred' })
  }
})

io.on('connection', wsHandler)
```

---

## Complete Example: Chat Application

### Folder Structure

```
ws/
  chat/
    @connect/
      steps/
        100-authenticate.js
        200-join-rooms.js
    @disconnect/
      steps/
        100-leave-rooms.js
        200-notify.js
    send/
      @message/
        steps/
          100-validate.js
          200-broadcast.js
        async-tasks/
          save-message.js
    join/
      @message/
        steps/
          100-join-room.js
    leave/
      @message/
        steps/
          100-leave-room.js
```

### Implementation

```javascript
// ws/chat/@connect/steps/100-authenticate.js
module.exports = async (ctx, trigger, responder) => {
  const token = trigger.socket.handshake.auth.token
  const user = await verifyToken(token)

  if (!user) {
    responder.emit('error', { message: 'Invalid token' })
    responder.disconnect()
    ctx.__stop = true // Stop further steps
    return
  }

  ctx.userId = user.id
  ctx.username = user.name
}
```

```javascript
// ws/chat/@connect/steps/200-join-rooms.js
module.exports = async (ctx, trigger, responder) => {
  // Join user's rooms
  const rooms = await getUserRooms(ctx.userId)
  for (const room of rooms) {
    responder.join(room)
  }
  ctx.rooms = rooms

  // Send welcome message
  responder.emit('connected', {
    userId: ctx.userId,
    rooms: ctx.rooms
  })
}
```

```javascript
// ws/chat/send/@message/steps/100-validate.js
module.exports = async (ctx, trigger, responder) => {
  const { room, message } = trigger.data

  if (!room || !message) {
    throw new Error('Room and message are required')
  }

  if (!ctx.rooms.includes(room)) {
    throw new Error('Not a member of this room')
  }

  ctx.room = room
  ctx.message = message
}
```

```javascript
// ws/chat/send/@message/steps/200-broadcast.js
module.exports = async (ctx, trigger, responder) => {
  responder.to(ctx.room).emit('chat:message', {
    userId: ctx.userId,
    username: ctx.username,
    message: ctx.message,
    timestamp: Date.now()
  })

  responder.emit('chat:sent', { success: true })
}
```

### Client Usage

```javascript
const socket = io('http://localhost:3000', {
  auth: { token: 'user-jwt-token' }
})

socket.on('connected', (data) => {
  console.log('Connected!', data.rooms)
})

socket.on('chat:message', (data) => {
  console.log(`${data.username}: ${data.message}`)
})

// Send message
socket.emit('chat:send', {
  room: 'general',
  message: 'Hello everyone!'
})

// Join room
socket.emit('chat:join', { room: 'random' })
```

---

## Best Practices

### 1. Authentication in @connect

Always authenticate users in the `@connect` step:

```javascript
// ws/chat/@connect/steps/100-authenticate.js
module.exports = async (ctx, trigger, responder) => {
  const token = trigger.socket.handshake.auth.token

  if (!token) {
    responder.emit('error', { message: 'No token provided' })
    responder.disconnect()
    ctx.__stop = true
    return
  }

  const user = await verifyToken(token)
  if (!user) {
    responder.emit('error', { message: 'Invalid token' })
    responder.disconnect()
    ctx.__stop = true
    return
  }

  ctx.user = user
}
```

### 2. Cleanup in @disconnect

Clean up resources when user disconnects:

```javascript
// ws/chat/@disconnect/steps/100-cleanup.js
module.exports = async (ctx, trigger, responder) => {
  // Notify others
  for (const room of ctx.rooms || []) {
    responder.to(room).emit('user:left', {
      userId: ctx.userId,
      username: ctx.username
    })
  }

  // Update user status
  await updateUserStatus(ctx.userId, 'offline')
}
```

### 3. Use Context for Connection State

Context persists for the entire connection:

```javascript
// Store state in @connect
ctx.userId = user.id
ctx.rooms = []
ctx.lastActivity = Date.now()

// Access in any @message step
console.log(ctx.userId) // Still available!
```

### 4. Error Handling

Handle errors gracefully:

```javascript
// ws/chat/@connect/index.js
module.exports = {
  onError: async (error, ctx, trigger, responder) => {
    // Log error
    console.error(`[${ctx.userId || 'unknown'}] ${error.message}`)

    // Notify client
    responder.emit('error', {
      message: error.message,
      code: error.code
    })

    // Disconnect if critical
    if (error.critical) {
      responder.disconnect()
    }
  }
}
```

---

## TypeScript Support

Full TypeScript support is available:

```typescript
import { WsContext, WsTrigger, WsResponder } from 'express-numflow'

interface ChatContext extends WsContext {
  userId: string
  username: string
  rooms: string[]
}

export default async function step(
  ctx: ChatContext,
  trigger: WsTrigger,
  responder: WsResponder
): Promise<void> {
  responder.emit('welcome', { user: ctx.username })
}
```

---

## See Also

- [Feature-First Architecture](./feature-first-architecture.md)
- [Convention over Configuration](./convention-over-configuration.md)
- [Error Handling](./error-handling.md)
- [API Reference](./api-reference.md)
