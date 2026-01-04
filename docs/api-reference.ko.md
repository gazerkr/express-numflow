# API 레퍼런스

express-numflow의 완전한 API 문서입니다.

## 목차

- [핵심 함수](#핵심-함수)
  - [createFeatureRouter()](#createfeaturerouter)
  - [feature()](#feature)
- [타입 정의](#타입-정의)
  - [Context](#context)
  - [StepFunction](#stepfunction)
  - [AsyncTaskFunction](#asynctaskfunction)
  - [FeatureConfig](#featureconfig)
  - [CreateFeatureRouterOptions](#createfeaturerouteroptions)
- [에러 처리](#에러-처리)
  - [FeatureError](#featureerror)
  - [ValidationError](#validationerror)
  - [retry()](#retry)
- [고급 사용법](#고급-사용법)
  - [미들웨어 통합](#미들웨어-통합)
  - [에러 복구](#에러-복구)
  - [Context 모범 사례](#context-모범-사례)
- [예제](#예제)

---

## 핵심 함수

### createFeatureRouter()

features 디렉토리를 스캔하여 모든 Feature를 자동으로 등록한 Express Router를 생성합니다.

#### 시그니처

```typescript
function createFeatureRouter(
  featuresDir: string,
  options?: CreateFeatureRouterOptions
): Promise<Router>
```

#### 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `featuresDir` | `string` | 예 | features 디렉토리 경로 (상대 또는 절대 경로) |
| `options` | `CreateFeatureRouterOptions` | 아니오 | 설정 옵션 |

#### 옵션

```typescript
interface CreateFeatureRouterOptions {
  indexPatterns?: string[]
  excludeDirs?: string[]
  debug?: boolean
  routerOptions?: RouterOptions
}
```

| 옵션 | 타입 | 기본값 | 설명 |
|-----|------|--------|------|
| `indexPatterns` | `string[]` | `['index.js', 'index.ts', 'index.mjs', 'index.mts']` | Feature index 파일로 인식할 파일 패턴 |
| `excludeDirs` | `string[]` | `['node_modules', '.git', 'dist', 'build']` | 스캔에서 제외할 디렉토리 이름 |
| `debug` | `boolean` | `false` | 디버그 로깅 활성화 |
| `routerOptions` | `RouterOptions` | `{}` | Express Router 생성자에 전달할 옵션 |

#### 반환값

`Promise<Router>` - 모든 Feature가 등록된 Express Router 인스턴스

#### 예외

- `Error` - features 디렉토리를 찾을 수 없는 경우
- `Error` - feature 파일이 유효하지 않은 경우

#### 예제

##### 기본 사용법

```javascript
const express = require('express')
const { createFeatureRouter } = require('express-numflow')

const app = express()
app.use(express.json())

// features 디렉토리에서 라우터 생성
const featureRouter = await createFeatureRouter('./features')
app.use(featureRouter)

app.listen(3000)
```

##### 디버그 로깅 활성화

```javascript
const router = await createFeatureRouter('./features', {
  debug: true,
})

// 콘솔 출력:
// [express-numflow] Scanning features directory: ./features
// [express-numflow] Found 5 features
// [express-numflow] Registered: POST /api/users (api/users/@post)
// [express-numflow] Registered: GET /api/users/:id (api/users/[id]/@get)
```

##### 커스텀 제외 디렉토리

```javascript
const router = await createFeatureRouter('./features', {
  excludeDirs: ['node_modules', '.git', 'test', 'temp', '__tests__'],
})
```

##### 다른 경로에 마운트

```javascript
// API v2
const apiV2Router = await createFeatureRouter('./features/api-v2')
app.use('/api/v2', apiV2Router)

// 관리자 페널
const adminRouter = await createFeatureRouter('./features/admin')
app.use('/admin', adminRouter)

// 모바일 API
const mobileRouter = await createFeatureRouter('./features/mobile')
app.use('/mobile', mobileRouter)
```

##### Express Router 옵션 사용

```javascript
const router = await createFeatureRouter('./features', {
  routerOptions: {
    caseSensitive: true,
    strict: true,
  },
})
```

##### ES 모듈 (Top-level await)

```javascript
// server.mjs
import express from 'express'
import { createFeatureRouter } from 'express-numflow'

const app = express()
const router = await createFeatureRouter('./features')
app.use(router)

app.listen(3000)
```

##### CommonJS (IIFE)

```javascript
// server.js
const express = require('express')
const { createFeatureRouter } = require('express-numflow')

const app = express()

;(async () => {
  const router = await createFeatureRouter('./features')
  app.use(router)

  app.listen(3000)
})()
```

---

### feature()

Feature 설정 객체를 생성합니다. Feature를 정의하는 핵심 함수입니다.

#### 시그니처

```typescript
function feature(config: FeatureConfig): Feature
```

#### 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `config` | `FeatureConfig` | 예 | Feature 설정 객체 |

#### 반환값

`Feature` - Express Router에 등록할 수 있는 Feature 인스턴스

#### 예제

##### 최소 설정 Feature (모두 자동 추론)

```javascript
// features/api/users/@post/index.js
const { feature } = require('express-numflow')

module.exports = feature({
  // method: @post 폴더에서 'POST'로 자동 추론
  // path: 폴더 구조에서 '/api/users'로 자동 추론
  // steps: ./steps 폴더에서 자동 발견
  // asyncTasks: ./async-tasks 폴더에서 자동 발견
})
```

##### Context Initializer 사용

```javascript
const { feature } = require('express-numflow')

module.exports = feature({
  contextInitializer: (ctx, req, res) => {
    ctx.userId = req.user?.id
    ctx.orderData = req.body
    ctx.timestamp = Date.now()
  },
})
```

##### 에러 핸들러 사용

```javascript
const { feature } = require('express-numflow')

module.exports = feature({
  contextInitializer: (ctx, req, res) => {
    ctx.orderData = req.body
  },

  onError: async (error, ctx, req, res) => {
    console.error('주문 생성 실패:', error)

    // 트랜잭션 롤백
    if (ctx.transaction) {
      await ctx.transaction.rollback()
    }

    res.status(500).json({
      success: false,
      error: error.message,
    })
  },
})
```

##### 미들웨어 사용

```javascript
const { feature } = require('express-numflow')
const { authenticate, authorize } = require('./middleware')

module.exports = feature({
  middlewares: [authenticate, authorize('admin')],

  contextInitializer: (ctx, req, res) => {
    ctx.userId = req.user.id  // authenticate 후 사용 가능
    ctx.role = req.user.role
  },
})
```

##### 명시적 설정 (Convention 재정의)

```javascript
const { feature } = require('express-numflow')

module.exports = feature({
  method: 'POST',
  path: '/custom/path',
  steps: './custom-steps',
  asyncTasks: './custom-tasks',

  contextInitializer: (ctx, req, res) => {
    ctx.customData = req.body
  },
})
```

##### 완전한 예제

```javascript
const { feature, retry } = require('express-numflow')
const { authenticate } = require('#middleware/auth')

module.exports = feature({
  middlewares: [authenticate],

  contextInitializer: (ctx, req, res) => {
    ctx.userId = req.user.id
    ctx.orderData = req.body
    ctx.retryCount = 0
  },

  onError: async (error, ctx, req, res) => {
    // 에러 로깅
    console.error('[주문 에러]', {
      userId: ctx.userId,
      error: error.message,
      retryCount: ctx.retryCount,
    })

    // 일시적 에러는 재시도
    if (error.code === 'ECONNRESET' && ctx.retryCount < 3) {
      ctx.retryCount++
      return retry()  // 즉시 재시도
    }

    // 데이터베이스 트랜잭션 롤백
    if (ctx.dbTransaction) {
      await ctx.dbTransaction.rollback()
    }

    // 에러 응답 전송
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message,
      retryCount: ctx.retryCount,
    })
  },
})
```

---

## 타입 정의

### Context

Steps와 Async Tasks 간에 데이터를 공유하는 데 사용되는 순수 JavaScript 객체입니다.

```typescript
interface Context {
  [key: string]: any
}
```

#### 주요 특징

- **순수 비즈니스 데이터**: HTTP (req/res)와 완전히 분리된 비즈니스 로직 데이터만 포함
- **Steps 간 공유**: Feature의 모든 steps가 동일한 context를 읽고 쓸 수 있음
- **변경 가능**: 필드를 언제든지 추가하거나 수정 가능
- **제약 없음**: 어떤 필드명도 사용 가능

#### 사용 패턴

##### contextInitializer에서 데이터 추가

```javascript
contextInitializer: (ctx, req, res) => {
  ctx.userId = req.user?.id
  ctx.orderData = req.body
  ctx.sessionId = req.session?.id
  ctx.timestamp = Date.now()
}
```

##### Steps에서 읽기와 쓰기

```javascript
// 100-validate.js
module.exports = async (ctx, req, res) => {
  const orderData = ctx.orderData  // 읽기

  if (!orderData.productId) {
    throw new Error('상품 ID가 필요합니다')
  }

  ctx.validated = true  // 쓰기
  ctx.validatedData = {
    productId: orderData.productId,
    quantity: orderData.quantity || 1,
  }
}

// 200-process.js
module.exports = async (ctx, req, res) => {
  const validated = ctx.validated  // 이전 step에서 읽기
  const data = ctx.validatedData

  const result = await processOrder(data)

  ctx.orderResult = result  // 다음 step을 위해 쓰기
}
```

#### 명명 규칙 (권장)

```javascript
// 좋음
ctx.userId
ctx.orderData
ctx.validatedInput
ctx.dbConnection
ctx.transactionId

// 접두사 사용
ctx.inputUserId
ctx.outputResult
ctx.dbTransaction
ctx.apiResponse

// 피하기 (향후 프레임워크 필드와 충돌 가능)
ctx.req  // context에 req/res 저장 금지
ctx.res
ctx._internal
```

---

### StepFunction

Feature의 순차 흐름의 일부로 비즈니스 로직을 실행하는 함수입니다.

```typescript
type StepFunction = (
  context: Context,
  req: IncomingMessage,
  res: ServerResponse
) => Promise<void> | void
```

#### 파라미터

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `context` | `Context` | 이 Feature 실행을 위한 공유 데이터 저장소 |
| `req` | `IncomingMessage` | HTTP Request 객체 |
| `res` | `ServerResponse` | HTTP Response 객체 |

#### 반환값

- `void` - Step 성공적으로 완료, 다음 step으로 진행
- `Promise<void>` - 비동기 step 완료, 다음 step으로 진행

> **주의**: 반환값은 무시됩니다. 흐름 제어는 다음을 기반으로 합니다:
> - 함수 완료 → 다음 step
> - `throw Error` → onError 핸들러
> - `res.headersSent === true` → 남은 steps 건너뛰기

#### 파일 명명 규칙

Steps는 반드시 패턴을 따라야 합니다: `{숫자}-{이름}.{확장자}`

- `{숫자}`: 실행 순서 (예: 100, 200, 300)
- `{이름}`: 설명적인 이름 (예: validate, create, send)
- `{확장자}`: 파일 확장자 (js, ts, mjs, mts)

```
steps/
  100-validate.js
  200-check-stock.js
  300-create-order.js
  400-charge-payment.js
  500-send-response.js
```

#### 예제

##### 기본 Step

```javascript
// steps/100-validate.js
module.exports = async (ctx, req, res) => {
  if (!req.body.email) {
    throw new Error('이메일이 필요합니다')
  }

  ctx.email = req.body.email
  ctx.validated = true
}
```

##### 데이터베이스 작업

```javascript
// steps/200-fetch-user.js
const db = require('#db')

module.exports = async (ctx, req, res) => {
  const user = await db.users.findByEmail(ctx.email)

  if (!user) {
    throw new Error('사용자를 찾을 수 없습니다')
  }

  ctx.user = user
}
```

##### 조건부 조기 응답

```javascript
// steps/100-check-cache.js
const cache = require('#lib/cache')

module.exports = async (ctx, req, res) => {
  const cached = await cache.get(req.url)

  if (cached) {
    // 조기 응답 - 남은 steps 건너뜀
    return res.json(cached)
  }

  // 캐시 없음, 다음 step 계속
  ctx.cacheChecked = true
}
```

##### 파라미터 유연성

```javascript
// context만 필요
module.exports = async (ctx) => {
  ctx.total = ctx.items.reduce((sum, item) => sum + item.price, 0)
}

// context와 request 필요
module.exports = async (ctx, req) => {
  ctx.userId = req.params.id
}

// 모두 필요
module.exports = async (ctx, req, res) => {
  res.json({ success: true, data: ctx.result })
}
```

##### 에러 처리

```javascript
// steps/300-charge-payment.js
const stripe = require('stripe')(process.env.STRIPE_KEY)

module.exports = async (ctx, req, res) => {
  try {
    const charge = await stripe.charges.create({
      amount: ctx.total,
      currency: 'usd',
      source: ctx.paymentToken,
    })

    ctx.chargeId = charge.id
    ctx.paid = true
  } catch (error) {
    // throw로 onError 핸들러 트리거
    throw new Error(`결제 실패: ${error.message}`)
  }
}
```

---

### AsyncTaskFunction

메인 Feature 실행 완료 후 백그라운드에서 실행되는 함수입니다.

```typescript
type AsyncTaskFunction = (
  context: Context
) => Promise<void> | void
```

#### 파라미터

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `context` | `Context` | 완료된 Feature 실행의 최종 context (읽기 전용) |

#### 주요 특징

- **논블로킹**: 클라이언트에 응답이 전송된 후 실행
- **Fire-and-forget**: 에러가 메인 응답에 영향을 주지 않음
- **병렬 실행**: 여러 작업이 동시에 실행됨
- **Context 접근**: 완료된 Steps의 모든 데이터를 읽을 수 있음

#### 파일 명명

숫자 접두사 불필요 (작업이 병렬로 실행됨):

```
async-tasks/
  send-email.js
  update-analytics.js
  log-audit.js
  sync-crm.js
```

#### 예제

##### 이메일 전송

```javascript
// async-tasks/send-confirmation-email.js
const { sendEmail } = require('#lib/email')

module.exports = async (ctx) => {
  await sendEmail({
    to: ctx.user.email,
    subject: '주문 확인',
    template: 'order-confirmation',
    data: {
      orderId: ctx.orderId,
      total: ctx.total,
    },
  })
}
```

##### 분석 업데이트

```javascript
// async-tasks/track-analytics.js
const analytics = require('#lib/analytics')

module.exports = async (ctx) => {
  await analytics.track('order_created', {
    userId: ctx.userId,
    orderId: ctx.orderId,
    total: ctx.total,
    items: ctx.items.length,
  })
}
```

##### 감사 로그

```javascript
// async-tasks/log-audit.js
const auditLog = require('#lib/audit')

module.exports = async (ctx) => {
  await auditLog.create({
    action: 'order_created',
    userId: ctx.userId,
    orderId: ctx.orderId,
    timestamp: ctx.timestamp,
    metadata: {
      total: ctx.total,
      itemCount: ctx.items.length,
    },
  })
}
```

##### 외부 동기화

```javascript
// async-tasks/sync-to-crm.js
const crmClient = require('#lib/crm')

module.exports = async (ctx) => {
  try {
    await crmClient.createOrder({
      orderId: ctx.orderId,
      customerId: ctx.userId,
      total: ctx.total,
    })
  } catch (error) {
    // 에러 로그만 (이미 클라이언트에 응답함)
    console.error('CRM 동기화 실패:', error)
  }
}
```

---

### FeatureConfig

Feature를 정의하기 위한 설정 객체입니다.

```typescript
interface FeatureConfig {
  method?: HttpMethod
  path?: string
  steps?: string
  asyncTasks?: string
  middlewares?: RequestHandler[]
  contextInitializer?: (context: Context, req: IncomingMessage, res: ServerResponse) => Promise<void> | void
  onError?: FeatureErrorHandler
}
```

#### 속성

| 속성 | 타입 | 필수 | 기본값 | 설명 |
|-----|------|------|--------|------|
| `method` | `HttpMethod` | 아니오 | 자동 추론 | HTTP 메서드 (GET, POST, PUT, DELETE, PATCH) |
| `path` | `string` | 아니오 | 자동 추론 | 라우트 경로 (예: '/api/users') |
| `steps` | `string` | 아니오 | `'./steps'` | steps 디렉토리 경로 |
| `asyncTasks` | `string` | 아니오 | `'./async-tasks'` | async tasks 디렉토리 경로 |
| `middlewares` | `RequestHandler[]` | 아니오 | `[]` | Feature 레벨 Express 미들웨어 |
| `contextInitializer` | `Function` | 아니오 | `undefined` | context를 초기화하는 함수 |
| `onError` | `FeatureErrorHandler` | 아니오 | `undefined` | 에러 핸들러 함수 |

#### Convention over Configuration

대부분의 속성은 선택적이며 폴더 구조에서 자동으로 추론됩니다:

##### 메서드 자동 추론

```
@get/     → GET
@post/    → POST
@put/     → PUT
@delete/  → DELETE
@patch/   → PATCH
```

##### 경로 자동 추론

```
features/api/users/@post/           → /api/users
features/api/posts/[id]/@get/       → /api/posts/:id
features/users/[id]/comments/@get/  → /users/:id/comments
```

##### Steps/AsyncTasks 자동 발견

폴더가 존재하면 자동으로 발견됩니다:
- `./steps/` → step 파일 스캔
- `./async-tasks/` → task 파일 스캔

---

### CreateFeatureRouterOptions

Feature router 생성 설정 옵션입니다.

```typescript
interface CreateFeatureRouterOptions {
  indexPatterns?: string[]
  excludeDirs?: string[]
  debug?: boolean
  routerOptions?: RouterOptions
}
```

자세한 문서는 [createFeatureRouter()](#createfeaturerouter)를 참조하세요.

---

## 에러 처리

### FeatureError

Feature 실행 중 발생하는 에러를 위한 에러 클래스입니다.

```typescript
class FeatureError extends Error {
  readonly originalError?: Error
  readonly step?: StepInfo
  readonly context?: Context
  readonly statusCode: number
}
```

#### 속성

| 속성 | 타입 | 설명 |
|-----|------|------|
| `message` | `string` | 에러 메시지 |
| `originalError` | `Error` | 원본 에러 |
| `step` | `StepInfo` | 에러가 발생한 step |
| `context` | `Context` | 에러 발생 시점의 context |
| `statusCode` | `number` | HTTP 상태 코드 (기본값: 500) |

#### onError 핸들러에서 사용

```javascript
onError: async (error, ctx, req, res) => {
  if (error instanceof FeatureError) {
    console.error('Feature 에러:', {
      message: error.message,
      step: error.step?.name,
      statusCode: error.statusCode,
    })

    // 원본 에러 접근
    if (error.originalError) {
      console.error('원본:', error.originalError)
    }
  }

  res.status(error.statusCode || 500).json({
    error: error.message,
  })
}
```

---

### ValidationError

유효성 검사 실패를 위한 특수 에러 (HTTP 400).

```typescript
class ValidationError extends FeatureError {
  constructor(message: string, context?: Context)
}
```

#### 사용법

```javascript
// step에서
const { ValidationError } = require('express-numflow')

module.exports = async (ctx, req, res) => {
  if (!req.body.email) {
    throw new ValidationError('이메일이 필요합니다')
  }

  if (!isValidEmail(req.body.email)) {
    throw new ValidationError('잘못된 이메일 형식입니다')
  }

  ctx.email = req.body.email
}
```

---

### retry()

onError 핸들러에서 Feature 재시도를 요청합니다.

```typescript
function retry(options?: {
  delay?: number
  maxAttempts?: number
}): RetrySignal

interface RetrySignal {
  __retry: true
  delay?: number
  maxAttempts?: number
}
```

#### 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `options` | `object` | 아니오 | 재시도 옵션 |
| `options.delay` | `number` | 아니오 | 재시도 전 대기 시간 (밀리초) |
| `options.maxAttempts` | `number` | 아니오 | 최대 재시도 횟수 |

#### 반환값

`RetrySignal` - Feature 실행 재시도 신호

#### 예제

##### 즉시 재시도

```javascript
const { retry } = require('express-numflow')

module.exports = feature({
  onError: async (error, ctx, req, res) => {
    if (error.code === 'ECONNRESET' && ctx.retryCount < 3) {
      ctx.retryCount = (ctx.retryCount || 0) + 1
      return retry()  // 즉시 재시도 (지연 없음)
    }

    res.status(500).json({ error: error.message })
  },
})
```

##### 지연 후 재시도

```javascript
const { retry } = require('express-numflow')

module.exports = feature({
  contextInitializer: (ctx, req, res) => {
    ctx.retryCount = 0
  },

  onError: async (error, ctx, req, res) => {
    if (error.code === 'ECONNRESET' && ctx.retryCount < 3) {
      ctx.retryCount++

      // 1초 후 재시도
      return retry({ delay: 1000 })
    }

    res.status(500).json({ error: '서비스를 사용할 수 없습니다' })
  },
})
```

##### 최대 재시도 횟수 지정

```javascript
const { retry } = require('express-numflow')

module.exports = feature({
  onError: async (error, ctx, req, res) => {
    if (error.message.includes('temporary_error')) {
      // 최대 3번까지 재시도
      return retry({ maxAttempts: 3 })
    }

    res.status(500).json({ error: error.message })
  },
})
```

##### 프로바이더 폴백 패턴

```javascript
const { retry } = require('express-numflow')

module.exports = feature({
  onError: async (error, ctx, req, res) => {
    // rate limit 시 다른 프로바이더로 폴백
    if (error.message.includes('rate_limit')) {
      ctx.fallbackProvider = 'openrouter'
      return retry()
    }

    // 타임아웃 시 지연 후 재시도
    if (error.message.includes('timeout')) {
      return retry({ delay: 1000 })
    }

    res.status(500).json({ error: error.message })
  },
})
```

---

## 고급 사용법

### 미들웨어 통합

#### Feature 레벨 미들웨어

contextInitializer 전에 실행됩니다:

```javascript
const { feature } = require('express-numflow')
const { authenticate, rateLimit } = require('./middleware')

module.exports = feature({
  middlewares: [
    authenticate,
    rateLimit({ max: 100, windowMs: 60000 }),
  ],

  contextInitializer: (ctx, req, res) => {
    ctx.userId = req.user.id  // authenticate 후 사용 가능
  },
})
```

#### 전역 미들웨어 + Feature 미들웨어

```javascript
const express = require('express')
const { createFeatureRouter } = require('express-numflow')
const { logger, cors } = require('./middleware')

const app = express()

// 전역 미들웨어 (모든 라우트)
app.use(express.json())
app.use(logger)
app.use(cors())

// Feature router (Feature 레벨 미들웨어 포함)
const router = await createFeatureRouter('./features')
app.use(router)
```

### 에러 복구

#### 트랜잭션 롤백

```javascript
module.exports = feature({
  contextInitializer: async (ctx, req, res) => {
    ctx.db = await createDbConnection()
    ctx.transaction = await ctx.db.beginTransaction()
  },

  onError: async (error, ctx, req, res) => {
    // 트랜잭션 롤백
    if (ctx.transaction) {
      await ctx.transaction.rollback()
    }

    // 연결 종료
    if (ctx.db) {
      await ctx.db.close()
    }

    res.status(500).json({ error: error.message })
  },
})
```

#### 리소스 정리

```javascript
module.exports = feature({
  contextInitializer: (ctx, req, res) => {
    ctx.tempFiles = []
  },

  onError: async (error, ctx, req, res) => {
    // 임시 파일 정리
    for (const file of ctx.tempFiles) {
      await fs.unlink(file).catch(() => {})
    }

    res.status(500).json({ error: error.message })
  },
})
```

### Context 모범 사례

#### 관심사 분리

```javascript
// 좋음: HTTP와 비즈니스 데이터 분리
contextInitializer: (ctx, req, res) => {
  // 비즈니스 데이터만 추출
  ctx.userId = req.user.id
  ctx.orderData = {
    productId: req.body.productId,
    quantity: req.body.quantity,
  }
}

// 나쁨: 전체 req/res 저장
contextInitializer: (ctx, req, res) => {
  ctx.req = req  // 하지 마세요
  ctx.res = res  // 하지 마세요
}
```

#### 타입 안전성 (TypeScript)

```typescript
interface OrderContext extends Context {
  userId: string
  orderData: {
    productId: string
    quantity: number
  }
  validated?: boolean
  orderId?: string
}

export default feature({
  contextInitializer: (ctx: OrderContext, req, res) => {
    ctx.userId = req.user.id
    ctx.orderData = req.body
  },
})
```

---

## 예제

### 완전한 전자상거래 주문 Feature

```
features/
  api/
    orders/
      @post/
        index.js
        steps/
          100-validate.js
          200-check-stock.js
          300-create-order.js
          400-charge-payment.js
          500-update-inventory.js
          600-send-response.js
        async-tasks/
          send-confirmation-email.js
          update-analytics.js
          sync-to-warehouse.js
```

#### index.js

```javascript
const { feature, retry } = require('express-numflow')
const { authenticate } = require('#middleware/auth')

module.exports = feature({
  middlewares: [authenticate],

  contextInitializer: (ctx, req, res) => {
    ctx.userId = req.user.id
    ctx.orderData = req.body
    ctx.retryCount = 0
  },

  onError: async (error, ctx, req, res) => {
    console.error('[주문 에러]', error)

    // 일시적 에러는 재시도
    if (error.code === 'ETIMEDOUT' && ctx.retryCount < 3) {
      ctx.retryCount++
      return retry()  // 즉시 재시도
    }

    // 롤백
    if (ctx.dbTransaction) {
      await ctx.dbTransaction.rollback()
    }

    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message,
    })
  },
})
```

#### steps/100-validate.js

```javascript
const { ValidationError } = require('express-numflow')

module.exports = async (ctx, req, res) => {
  const { items, shippingAddress } = ctx.orderData

  if (!items || items.length === 0) {
    throw new ValidationError('주문에 최소 하나의 상품이 필요합니다')
  }

  if (!shippingAddress) {
    throw new ValidationError('배송 주소가 필요합니다')
  }

  ctx.validated = true
  ctx.items = items
  ctx.shippingAddress = shippingAddress
}
```

#### steps/200-check-stock.js

```javascript
const inventory = require('#lib/inventory')

module.exports = async (ctx, req, res) => {
  for (const item of ctx.items) {
    const available = await inventory.checkStock(item.productId)

    if (available < item.quantity) {
      throw new Error(`${item.productId}의 재고가 부족합니다`)
    }
  }

  ctx.stockChecked = true
}
```

#### steps/300-create-order.js

```javascript
const db = require('#db')

module.exports = async (ctx, req, res) => {
  const order = await db.orders.create({
    userId: ctx.userId,
    items: ctx.items,
    shippingAddress: ctx.shippingAddress,
    status: 'pending',
    createdAt: new Date(),
  })

  ctx.orderId = order.id
  ctx.order = order
}
```

#### steps/400-charge-payment.js

```javascript
const stripe = require('#lib/stripe')

module.exports = async (ctx, req, res) => {
  const total = ctx.items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const charge = await stripe.charges.create({
    amount: total,
    currency: 'usd',
    source: ctx.orderData.paymentToken,
    description: `주문 ${ctx.orderId}`,
  })

  ctx.chargeId = charge.id
  ctx.total = total
}
```

#### steps/500-update-inventory.js

```javascript
const inventory = require('#lib/inventory')

module.exports = async (ctx, req, res) => {
  for (const item of ctx.items) {
    await inventory.decrementStock(item.productId, item.quantity)
  }

  ctx.inventoryUpdated = true
}
```

#### steps/600-send-response.js

```javascript
module.exports = async (ctx, req, res) => {
  res.status(201).json({
    success: true,
    orderId: ctx.orderId,
    total: ctx.total,
    chargeId: ctx.chargeId,
  })
}
```

#### async-tasks/send-confirmation-email.js

```javascript
const { sendEmail } = require('#lib/email')

module.exports = async (ctx) => {
  await sendEmail({
    to: ctx.orderData.email,
    subject: '주문 확인',
    template: 'order-confirmation',
    data: {
      orderId: ctx.orderId,
      total: ctx.total,
      items: ctx.items,
    },
  })
}
```

---

## 관련 문서

- [README](../README.ko.md) - 시작 가이드
- [Feature-First 아키텍처](./feature-first-architecture.ko.md) - 아키텍처 가이드
- [Convention over Configuration](./convention-over-configuration.ko.md) - Convention 가이드
- [경로 별칭](./path-aliasing.ko.md) - 경로 별칭 전략
