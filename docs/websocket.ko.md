# WebSocket 지원

> Socket.io WebSocket 애플리케이션을 위한 Feature-First 아키텍처

express-numflow는 Convention over Configuration 철학을 Socket.io를 사용하는 WebSocket 애플리케이션으로 확장합니다. HTTP 라우트와 마찬가지로 WebSocket 이벤트도 폴더 구조로 정리할 수 있습니다.

---

## 빠른 시작

```javascript
const express = require('express')
const { createServer } = require('http')
const { Server } = require('socket.io')
const { createWsHandler } = require('express-numflow')

const app = express()
const server = createServer(app)
const io = new Server(server)

// 폴더 구조에서 WebSocket 핸들러 생성
const wsHandler = await createWsHandler('./ws')

// Socket.io에 연결
io.on('connection', wsHandler)

server.listen(3000)
```

---

## Convention over Configuration

### 폴더 구조 = WebSocket 이벤트

```
ws/
  chat/
    @connect/                  <- 'connect' 이벤트 (연결)
      steps/
        100-authenticate.js
        200-join-default-room.js
    @disconnect/               <- 'disconnect' 이벤트 (연결 해제)
      steps/
        100-cleanup.js
    send/
      @message/                <- 'chat:send' 이벤트
        steps/
          100-validate.js
          200-broadcast.js
        async-tasks/
          save-to-db.js
    join/
      @message/                <- 'chat:join' 이벤트
        steps/
          100-join-room.js
```

### 이벤트 타입

`@` 접두사로 이벤트 타입을 정의합니다:

| 폴더 | 이벤트 타입 | 설명 |
|------|-------------|------|
| `@connect` | 연결 | 클라이언트 연결 시 실행 |
| `@disconnect` | 연결 해제 | 클라이언트 연결 해제 시 실행 |
| `@message` | 커스텀 메시지 | 클라이언트의 커스텀 이벤트 |

### 이벤트 이름 추론

폴더 경로가 이벤트 이름이 됩니다:

```
chat/send/@message/      -> 'chat:send' 이벤트
chat/join/@message/      -> 'chat:join' 이벤트
room/create/@message/    -> 'room:create' 이벤트
user/typing/@message/    -> 'user:typing' 이벤트
```

> 참고: `@connect`와 `@disconnect`는 항상 'connect'와 'disconnect'로 해석됩니다.

---

## Steps (순차 실행)

Steps는 HTTP 기능과 마찬가지로 숫자 순서대로 실행됩니다. `.js`와 `.ts` Step 파일 모두 지원됩니다 (TypeScript는 jiti를 통해 네이티브 지원).

```javascript
// ws/chat/send/@message/steps/100-validate.js
module.exports = async (ctx, trigger, responder) => {
  if (!trigger.data.message) {
    throw new Error('메시지가 필요합니다')
  }
  ctx.message = trigger.data.message
}
```

```javascript
// ws/chat/send/@message/steps/200-broadcast.js
module.exports = async (ctx, trigger, responder) => {
  // 방에 있는 모든 클라이언트에게 브로드캐스트
  responder.to(ctx.room).emit('chat:message', {
    user: ctx.userId,
    message: ctx.message,
    timestamp: Date.now()
  })

  // 보낸 사람에게 확인
  responder.emit('chat:sent', { success: true })
}
```

**흐름**: 100 -> 200 (자동!)

---

## Step 파라미터

각 Step은 세 개의 파라미터를 받습니다:

### 1. Context (`ctx`)

Context는 연결이 유지되는 동안 지속됩니다:

```javascript
// ws/chat/@connect/steps/100-authenticate.js
module.exports = async (ctx, trigger, responder) => {
  // 연결 시 사용자 정보 설정
  ctx.userId = trigger.socket.handshake.auth.userId
  ctx.username = await getUserName(ctx.userId)
  ctx.room = 'general'
}

// ws/chat/send/@message/steps/200-broadcast.js
module.exports = async (ctx, trigger, responder) => {
  // ctx.userId와 ctx.username이 여전히 사용 가능!
  responder.to(ctx.room).emit('message', {
    user: ctx.username,
    text: ctx.message
  })
}
```

### 2. Trigger (`trigger`)

이벤트 정보를 포함합니다:

```typescript
interface WsTrigger {
  type: 'ws'              // 항상 'ws'
  event: WsEventType      // 'connect' | 'disconnect' | 'message'
  eventName: string       // 예: 'chat:send'
  data: any               // 클라이언트가 보낸 데이터
  socket: Socket          // Socket.io 소켓 객체
  io: Server              // Socket.io 서버 객체
}
```

### 3. Responder (`responder`)

응답 전송을 위한 헬퍼:

```typescript
interface WsResponder {
  // 현재 소켓에 전송
  emit(event: string, data: any): void

  // 자신을 제외한 모든 소켓에 브로드캐스트
  broadcast(event: string, data: any): void

  // 특정 방에 전송 (자신 제외)
  to(room: string): WsResponder

  // 모든 소켓에 전송 (자신 포함)
  toAll(event: string, data: any): void

  // 방에 참가
  join(room: string): void

  // 방에서 나가기
  leave(room: string): void

  // 연결 해제
  disconnect(close?: boolean): void
}
```

**예제:**

```javascript
module.exports = async (ctx, trigger, responder) => {
  // 자신에게 전송
  responder.emit('notification', { text: '환영합니다!' })

  // 자신을 제외한 모든 사람에게 브로드캐스트
  responder.broadcast('user:joined', { userId: ctx.userId })

  // 특정 방에 전송
  responder.to('admins').emit('alert', { message: '새 사용자' })

  // 자신을 포함한 모든 사람에게 전송
  responder.toAll('system', { text: '서버 공지' })

  // 방 관리
  responder.join('vip-room')
  responder.leave('general')
}
```

---

## Async Tasks

응답 후 백그라운드에서 실행되는 작업:

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
    await sendPushNotification(userId, `${ctx.username}님이 당신을 언급했습니다`)
  }
}
```

---

## Feature 설정

고급 설정을 위한 선택적 `index.js`:

```javascript
// ws/chat/@connect/index.js
const { wsFeature } = require('express-numflow')

module.exports = wsFeature({
  // Context 초기화
  contextInitializer: async (ctx, trigger) => {
    ctx.userId = trigger.socket.handshake.auth.userId
    ctx.connectedAt = Date.now()
  },

  // 에러 처리
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

## API 레퍼런스

### `createWsHandler(featuresDir, options?)`

features 디렉토리에서 WebSocket 핸들러를 생성합니다.

**파라미터:**

- `featuresDir` (string): WebSocket features 디렉토리 경로
- `options` (object, 선택사항):
  - `debug` (boolean): 디버그 로깅 활성화 (기본값: `false`)
  - `excludeDirs` (string[]): 제외할 디렉토리 (기본값: `['node_modules', '.git', 'dist', 'build']`)
  - `contextMaxAge` (number): Context 최대 유지 시간 ms (기본값: `86400000` / 24시간)
  - `contextCleanupInterval` (number): Context 정리 주기 ms (기본값: `60000` / 1분)
  - `onError` (function): 전역 에러 핸들러

**반환:** `Promise<WsHandler>`

**예제:**

```javascript
const wsHandler = await createWsHandler('./ws', {
  debug: true,
  contextMaxAge: 12 * 60 * 60 * 1000, // 12시간
  onError: async (error, ctx, trigger, responder) => {
    console.error(`[WS Error] ${error.message}`)
    responder.emit('error', { message: '오류가 발생했습니다' })
  }
})

io.on('connection', wsHandler)
```

---

## 완전한 예제: 채팅 애플리케이션

### 폴더 구조

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

### 구현

```javascript
// ws/chat/@connect/steps/100-authenticate.js
module.exports = async (ctx, trigger, responder) => {
  const token = trigger.socket.handshake.auth.token
  const user = await verifyToken(token)

  if (!user) {
    responder.emit('error', { message: '유효하지 않은 토큰' })
    responder.disconnect()
    ctx.__stop = true // 다음 Step 중지
    return
  }

  ctx.userId = user.id
  ctx.username = user.name
}
```

```javascript
// ws/chat/@connect/steps/200-join-rooms.js
module.exports = async (ctx, trigger, responder) => {
  // 사용자의 방에 참가
  const rooms = await getUserRooms(ctx.userId)
  for (const room of rooms) {
    responder.join(room)
  }
  ctx.rooms = rooms

  // 환영 메시지 전송
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
    throw new Error('방과 메시지가 필요합니다')
  }

  if (!ctx.rooms.includes(room)) {
    throw new Error('이 방의 멤버가 아닙니다')
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

### 클라이언트 사용법

```javascript
const socket = io('http://localhost:3000', {
  auth: { token: 'user-jwt-token' }
})

socket.on('connected', (data) => {
  console.log('연결됨!', data.rooms)
})

socket.on('chat:message', (data) => {
  console.log(`${data.username}: ${data.message}`)
})

// 메시지 전송
socket.emit('chat:send', {
  room: 'general',
  message: '안녕하세요!'
})

// 방 참가
socket.emit('chat:join', { room: 'random' })
```

---

## 베스트 프랙티스

### 1. @connect에서 인증

항상 `@connect` Step에서 사용자를 인증하세요:

```javascript
// ws/chat/@connect/steps/100-authenticate.js
module.exports = async (ctx, trigger, responder) => {
  const token = trigger.socket.handshake.auth.token

  if (!token) {
    responder.emit('error', { message: '토큰이 제공되지 않았습니다' })
    responder.disconnect()
    ctx.__stop = true
    return
  }

  const user = await verifyToken(token)
  if (!user) {
    responder.emit('error', { message: '유효하지 않은 토큰' })
    responder.disconnect()
    ctx.__stop = true
    return
  }

  ctx.user = user
}
```

### 2. @disconnect에서 정리

사용자가 연결 해제될 때 리소스를 정리하세요:

```javascript
// ws/chat/@disconnect/steps/100-cleanup.js
module.exports = async (ctx, trigger, responder) => {
  // 다른 사용자에게 알림
  for (const room of ctx.rooms || []) {
    responder.to(room).emit('user:left', {
      userId: ctx.userId,
      username: ctx.username
    })
  }

  // 사용자 상태 업데이트
  await updateUserStatus(ctx.userId, 'offline')
}
```

### 3. 연결 상태에 Context 사용

Context는 전체 연결 동안 유지됩니다:

```javascript
// @connect에서 상태 저장
ctx.userId = user.id
ctx.rooms = []
ctx.lastActivity = Date.now()

// 어떤 @message Step에서든 접근 가능
console.log(ctx.userId) // 여전히 사용 가능!
```

### 4. 에러 처리

에러를 우아하게 처리하세요:

```javascript
// ws/chat/@connect/index.js
module.exports = {
  onError: async (error, ctx, trigger, responder) => {
    // 에러 로깅
    console.error(`[${ctx.userId || 'unknown'}] ${error.message}`)

    // 클라이언트에 알림
    responder.emit('error', {
      message: error.message,
      code: error.code
    })

    // 치명적인 경우 연결 해제
    if (error.critical) {
      responder.disconnect()
    }
  }
}
```

---

## TypeScript 지원

완전한 TypeScript 지원을 제공합니다:

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

## 참고

- [Feature-First 아키텍처](./feature-first-architecture.ko.md)
- [Convention over Configuration](./convention-over-configuration.ko.md)
- [에러 처리](./error-handling.ko.md)
- [API 레퍼런스](./api-reference.ko.md)
