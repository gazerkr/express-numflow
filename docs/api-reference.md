# API Reference

Complete API documentation for express-numflow.

## Table of Contents

- [Core Functions](#core-functions)
  - [createFeatureRouter()](#createfeaturerouter)
  - [feature()](#feature)
- [Type Definitions](#type-definitions)
  - [Context](#context)
  - [StepFunction](#stepfunction)
  - [AsyncTaskFunction](#asynctaskfunction)
  - [FeatureConfig](#featureconfig)
  - [CreateFeatureRouterOptions](#createfeaturerouteroptions)
- [Error Handling](#error-handling)
  - [FeatureError](#featureerror)
  - [ValidationError](#validationerror)
  - [retry()](#retry)
- [Advanced Usage](#advanced-usage)
  - [Middleware Integration](#middleware-integration)
  - [Error Recovery](#error-recovery)
  - [Context Best Practices](#context-best-practices)
- [Examples](#examples)

---

## Core Functions

### createFeatureRouter()

Creates an Express Router by scanning a features directory and automatically registering all Features.

#### Signature

```typescript
function createFeatureRouter(
  featuresDir: string,
  options?: CreateFeatureRouterOptions
): Promise<Router>
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `featuresDir` | `string` | Yes | Path to the features directory (relative or absolute) |
| `options` | `CreateFeatureRouterOptions` | No | Configuration options |

#### Options

```typescript
interface CreateFeatureRouterOptions {
  indexPatterns?: string[]
  excludeDirs?: string[]
  debug?: boolean
  routerOptions?: RouterOptions
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `indexPatterns` | `string[]` | `['index.js', 'index.ts', 'index.mjs', 'index.mts']` | File patterns to recognize as Feature index files |
| `excludeDirs` | `string[]` | `['node_modules', '.git', 'dist', 'build']` | Directory names to exclude from scanning |
| `debug` | `boolean` | `false` | Enable debug logging to console |
| `routerOptions` | `RouterOptions` | `{}` | Options passed to Express Router constructor |

#### Returns

`Promise<Router>` - Express Router instance with all Features registered

#### Throws

- `Error` - If features directory not found
- `Error` - If feature files are invalid

#### Examples

##### Basic Usage

```javascript
const express = require('express')
const { createFeatureRouter } = require('express-numflow')

const app = express()
app.use(express.json())

// Create router from features directory
const featureRouter = await createFeatureRouter('./features')
app.use(featureRouter)

app.listen(3000)
```

##### With Debug Logging

```javascript
const router = await createFeatureRouter('./features', {
  debug: true,
})

// Console output:
// [express-numflow] Scanning features directory: ./features
// [express-numflow] Found 5 features
// [express-numflow] Registered: POST /api/users (api/users/@post)
// [express-numflow] Registered: GET /api/users/:id (api/users/[id]/@get)
```

##### Custom Exclude Directories

```javascript
const router = await createFeatureRouter('./features', {
  excludeDirs: ['node_modules', '.git', 'test', 'temp', '__tests__'],
})
```

##### Mount on Different Paths

```javascript
// API v2
const apiV2Router = await createFeatureRouter('./features/api-v2')
app.use('/api/v2', apiV2Router)

// Admin panel
const adminRouter = await createFeatureRouter('./features/admin')
app.use('/admin', adminRouter)

// Mobile API
const mobileRouter = await createFeatureRouter('./features/mobile')
app.use('/mobile', mobileRouter)
```

##### With Express Router Options

```javascript
const router = await createFeatureRouter('./features', {
  routerOptions: {
    caseSensitive: true,
    strict: true,
  },
})
```

##### ES Modules (Top-level await)

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

Creates a Feature configuration object. This is the core function for defining Features.

#### Signature

```typescript
function feature(config: FeatureConfig): Feature
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `config` | `FeatureConfig` | Yes | Feature configuration object |

#### Returns

`Feature` - Feature instance that can be registered to Express Router

#### Examples

##### Minimal Feature (All Auto-inferred)

```javascript
// features/api/users/@post/index.js
const { feature } = require('express-numflow')

module.exports = feature({
  // method: Auto-inferred as 'POST' from @post folder
  // path: Auto-inferred as '/api/users' from folder structure
  // steps: Auto-discovered from ./steps folder
  // asyncTasks: Auto-discovered from ./async-tasks folder
})
```

##### With Context Initializer

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

##### With Error Handler

```javascript
const { feature } = require('express-numflow')

module.exports = feature({
  contextInitializer: (ctx, req, res) => {
    ctx.orderData = req.body
  },

  onError: async (error, ctx, req, res) => {
    console.error('Order creation failed:', error)

    // Rollback transaction if exists
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

##### With Middleware

```javascript
const { feature } = require('express-numflow')
const { authenticate, authorize } = require('./middleware')

module.exports = feature({
  middlewares: [authenticate, authorize('admin')],

  contextInitializer: (ctx, req, res) => {
    ctx.userId = req.user.id  // Available after authenticate
    ctx.role = req.user.role
  },
})
```

##### Explicit Configuration (Override Convention)

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

##### Complete Example

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
    // Log error
    console.error('[Order Error]', {
      userId: ctx.userId,
      error: error.message,
      retryCount: ctx.retryCount,
    })

    // Retry on transient errors
    if (error.code === 'ECONNRESET' && ctx.retryCount < 3) {
      ctx.retryCount++
      return retry()  // Immediate retry
    }

    // Rollback database transaction
    if (ctx.dbTransaction) {
      await ctx.dbTransaction.rollback()
    }

    // Send error response
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message,
      retryCount: ctx.retryCount,
    })
  },
})
```

---

## Type Definitions

### Context

The Context object is a plain JavaScript object used to share data between Steps and Async Tasks.

```typescript
interface Context {
  [key: string]: any
}
```

#### Key Characteristics

- **Pure Business Data**: Contains only business logic data, completely separated from HTTP (req/res)
- **Shared Across Steps**: All steps in a Feature can read and write to the same context
- **Mutable**: Fields can be added or modified at any time
- **No Restrictions**: Any field name can be used

#### Usage Patterns

##### Adding Data in contextInitializer

```javascript
contextInitializer: (ctx, req, res) => {
  ctx.userId = req.user?.id
  ctx.orderData = req.body
  ctx.sessionId = req.session?.id
  ctx.timestamp = Date.now()
}
```

##### Reading and Writing in Steps

```javascript
// 100-validate.js
module.exports = async (ctx, req, res) => {
  const orderData = ctx.orderData  // Read

  if (!orderData.productId) {
    throw new Error('Product ID required')
  }

  ctx.validated = true  // Write
  ctx.validatedData = {
    productId: orderData.productId,
    quantity: orderData.quantity || 1,
  }
}

// 200-process.js
module.exports = async (ctx, req, res) => {
  const validated = ctx.validated  // Read from previous step
  const data = ctx.validatedData

  const result = await processOrder(data)

  ctx.orderResult = result  // Write for next step
}
```

#### Naming Conventions (Recommended)

```javascript
// Good
ctx.userId
ctx.orderData
ctx.validatedInput
ctx.dbConnection
ctx.transactionId

// With prefixes
ctx.inputUserId
ctx.outputResult
ctx.dbTransaction
ctx.apiResponse

// Avoid (could conflict with future framework fields)
ctx.req  // Don't store req/res in context
ctx.res
ctx._internal
```

---

### StepFunction

A function that executes business logic as part of a Feature's sequential flow.

```typescript
type StepFunction = (
  context: Context,
  req: IncomingMessage,
  res: ServerResponse
) => Promise<void> | void
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `context` | `Context` | Shared data storage for this Feature execution |
| `req` | `IncomingMessage` | HTTP Request object |
| `res` | `ServerResponse` | HTTP Response object |

#### Return Value

- `void` - Step completed successfully, proceed to next step
- `Promise<void>` - Async step completed, proceed to next step

> **Note**: Return values are ignored. Flow control is based on:
> - Function completes → Next step
> - `throw Error` → onError handler
> - `res.headersSent === true` → Skip remaining steps

#### File Naming Convention

Steps must follow the pattern: `{number}-{name}.{ext}`

- `{number}`: Execution order (e.g., 100, 200, 300)
- `{name}`: Descriptive name (e.g., validate, create, send)
- `{ext}`: File extension (js, ts, mjs, mts)

```
steps/
  100-validate.js
  200-check-stock.js
  300-create-order.js
  400-charge-payment.js
  500-send-response.js
```

#### Examples

##### Basic Step

```javascript
// steps/100-validate.js
module.exports = async (ctx, req, res) => {
  if (!req.body.email) {
    throw new Error('Email is required')
  }

  ctx.email = req.body.email
  ctx.validated = true
}
```

##### Database Operation

```javascript
// steps/200-fetch-user.js
const db = require('#db')

module.exports = async (ctx, req, res) => {
  const user = await db.users.findByEmail(ctx.email)

  if (!user) {
    throw new Error('User not found')
  }

  ctx.user = user
}
```

##### Conditional Early Response

```javascript
// steps/100-check-cache.js
const cache = require('#lib/cache')

module.exports = async (ctx, req, res) => {
  const cached = await cache.get(req.url)

  if (cached) {
    // Early response - remaining steps skipped
    return res.json(cached)
  }

  // No cache, continue to next step
  ctx.cacheChecked = true
}
```

##### Parameter Flexibility

```javascript
// Only need context
module.exports = async (ctx) => {
  ctx.total = ctx.items.reduce((sum, item) => sum + item.price, 0)
}

// Need context and request
module.exports = async (ctx, req) => {
  ctx.userId = req.params.id
}

// Need all three
module.exports = async (ctx, req, res) => {
  res.json({ success: true, data: ctx.result })
}
```

##### Error Handling

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
    // Throw to trigger onError handler
    throw new Error(`Payment failed: ${error.message}`)
  }
}
```

---

### AsyncTaskFunction

A function that executes in the background after the main Feature execution completes.

```typescript
type AsyncTaskFunction = (
  context: Context
) => Promise<void> | void
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `context` | `Context` | Final context from completed Feature execution (read-only) |

#### Key Characteristics

- **Non-blocking**: Executed after response is sent to client
- **Fire-and-forget**: Errors don't affect main response
- **Parallel execution**: Multiple tasks run concurrently
- **Context access**: Can read all data from completed Steps

#### File Naming

No number prefix required (tasks run in parallel):

```
async-tasks/
  send-email.js
  update-analytics.js
  log-audit.js
  sync-crm.js
```

#### Examples

##### Send Email

```javascript
// async-tasks/send-confirmation-email.js
const { sendEmail } = require('#lib/email')

module.exports = async (ctx) => {
  await sendEmail({
    to: ctx.user.email,
    subject: 'Order Confirmation',
    template: 'order-confirmation',
    data: {
      orderId: ctx.orderId,
      total: ctx.total,
    },
  })
}
```

##### Update Analytics

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

##### Audit Logging

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

##### External Sync

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
    // Log error but don't throw (already responded to client)
    console.error('CRM sync failed:', error)
  }
}
```

---

### FeatureConfig

Configuration object for defining a Feature.

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

#### Properties

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `method` | `HttpMethod` | No | Auto-inferred | HTTP method (GET, POST, PUT, DELETE, PATCH) |
| `path` | `string` | No | Auto-inferred | Route path (e.g., '/api/users') |
| `steps` | `string` | No | `'./steps'` | Path to steps directory |
| `asyncTasks` | `string` | No | `'./async-tasks'` | Path to async tasks directory |
| `middlewares` | `RequestHandler[]` | No | `[]` | Feature-level Express middlewares |
| `contextInitializer` | `Function` | No | `undefined` | Function to initialize context |
| `onError` | `FeatureErrorHandler` | No | `undefined` | Error handler function |

#### Convention over Configuration

Most properties are optional and auto-inferred from folder structure:

##### Method Auto-inference

```
@get/     → GET
@post/    → POST
@put/     → PUT
@delete/  → DELETE
@patch/   → PATCH
```

##### Path Auto-inference

```
features/api/users/@post/           → /api/users
features/api/posts/[id]/@get/       → /api/posts/:id
features/users/[id]/comments/@get/  → /users/:id/comments
```

##### Steps/AsyncTasks Auto-discovery

If folders exist, they're automatically discovered:
- `./steps/` → Scanned for step files
- `./async-tasks/` → Scanned for task files

---

### CreateFeatureRouterOptions

Options for configuring the Feature router creation.

```typescript
interface CreateFeatureRouterOptions {
  indexPatterns?: string[]
  excludeDirs?: string[]
  debug?: boolean
  routerOptions?: RouterOptions
}
```

See [createFeatureRouter()](#createfeaturerouter) for detailed documentation.

---

## Error Handling

### FeatureError

Error class for errors that occur during Feature execution.

```typescript
class FeatureError extends Error {
  readonly originalError?: Error
  readonly step?: StepInfo
  readonly context?: Context
  readonly statusCode: number
}
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `message` | `string` | Error message |
| `originalError` | `Error` | Original error that was thrown |
| `step` | `StepInfo` | Step where error occurred |
| `context` | `Context` | Context at time of error |
| `statusCode` | `number` | HTTP status code (default: 500) |

#### Usage in onError Handler

```javascript
onError: async (error, ctx, req, res) => {
  if (error instanceof FeatureError) {
    console.error('Feature error:', {
      message: error.message,
      step: error.step?.name,
      statusCode: error.statusCode,
    })

    // Access original error
    if (error.originalError) {
      console.error('Original:', error.originalError)
    }
  }

  res.status(error.statusCode || 500).json({
    error: error.message,
  })
}
```

---

### ValidationError

Specialized error for validation failures (HTTP 400).

```typescript
class ValidationError extends FeatureError {
  constructor(message: string, context?: Context)
}
```

#### Usage

```javascript
// In a step
const { ValidationError } = require('express-numflow')

module.exports = async (ctx, req, res) => {
  if (!req.body.email) {
    throw new ValidationError('Email is required')
  }

  if (!isValidEmail(req.body.email)) {
    throw new ValidationError('Invalid email format')
  }

  ctx.email = req.body.email
}
```

---

### retry()

Request Feature retry from onError handler.

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

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `options` | `object` | No | Retry options |
| `options.delay` | `number` | No | Wait time before retry (milliseconds) |
| `options.maxAttempts` | `number` | No | Maximum retry attempts |

#### Returns

`RetrySignal` - Signal to retry Feature execution

#### Examples

##### Immediate Retry

```javascript
const { retry } = require('express-numflow')

module.exports = feature({
  onError: async (error, ctx, req, res) => {
    if (error.code === 'ECONNRESET' && ctx.retryCount < 3) {
      ctx.retryCount = (ctx.retryCount || 0) + 1
      return retry()  // Immediate retry (no delay)
    }

    res.status(500).json({ error: error.message })
  },
})
```

##### Retry with Delay

```javascript
const { retry } = require('express-numflow')

module.exports = feature({
  contextInitializer: (ctx, req, res) => {
    ctx.retryCount = 0
  },

  onError: async (error, ctx, req, res) => {
    if (error.code === 'ECONNRESET' && ctx.retryCount < 3) {
      ctx.retryCount++

      // Retry after 1 second
      return retry({ delay: 1000 })
    }

    res.status(500).json({ error: 'Service unavailable' })
  },
})
```

##### Retry with Maximum Attempts

```javascript
const { retry } = require('express-numflow')

module.exports = feature({
  onError: async (error, ctx, req, res) => {
    if (error.message.includes('temporary_error')) {
      // Retry up to 3 times
      return retry({ maxAttempts: 3 })
    }

    res.status(500).json({ error: error.message })
  },
})
```

##### Provider Fallback Pattern

```javascript
const { retry } = require('express-numflow')

module.exports = feature({
  onError: async (error, ctx, req, res) => {
    // Fallback to different provider on rate limit
    if (error.message.includes('rate_limit')) {
      ctx.fallbackProvider = 'openrouter'
      return retry()
    }

    // Retry with delay on timeout
    if (error.message.includes('timeout')) {
      return retry({ delay: 1000 })
    }

    res.status(500).json({ error: error.message })
  },
})
```

---

## Advanced Usage

### Middleware Integration

#### Feature-level Middleware

Runs before contextInitializer:

```javascript
const { feature } = require('express-numflow')
const { authenticate, rateLimit } = require('./middleware')

module.exports = feature({
  middlewares: [
    authenticate,
    rateLimit({ max: 100, windowMs: 60000 }),
  ],

  contextInitializer: (ctx, req, res) => {
    ctx.userId = req.user.id  // Available after authenticate
  },
})
```

#### Global Middleware + Feature Middleware

```javascript
const express = require('express')
const { createFeatureRouter } = require('express-numflow')
const { logger, cors } = require('./middleware')

const app = express()

// Global middleware (all routes)
app.use(express.json())
app.use(logger)
app.use(cors())

// Feature router (with feature-level middleware)
const router = await createFeatureRouter('./features')
app.use(router)
```

### Error Recovery

#### Transaction Rollback

```javascript
module.exports = feature({
  contextInitializer: async (ctx, req, res) => {
    ctx.db = await createDbConnection()
    ctx.transaction = await ctx.db.beginTransaction()
  },

  onError: async (error, ctx, req, res) => {
    // Rollback transaction
    if (ctx.transaction) {
      await ctx.transaction.rollback()
    }

    // Close connection
    if (ctx.db) {
      await ctx.db.close()
    }

    res.status(500).json({ error: error.message })
  },
})
```

#### Cleanup Resources

```javascript
module.exports = feature({
  contextInitializer: (ctx, req, res) => {
    ctx.tempFiles = []
  },

  onError: async (error, ctx, req, res) => {
    // Clean up temp files
    for (const file of ctx.tempFiles) {
      await fs.unlink(file).catch(() => {})
    }

    res.status(500).json({ error: error.message })
  },
})
```

### Context Best Practices

#### Separation of Concerns

```javascript
// Good: Separate HTTP and business data
contextInitializer: (ctx, req, res) => {
  // Extract only business data
  ctx.userId = req.user.id
  ctx.orderData = {
    productId: req.body.productId,
    quantity: req.body.quantity,
  }
}

// Bad: Storing entire req/res
contextInitializer: (ctx, req, res) => {
  ctx.req = req  // Don't do this
  ctx.res = res  // Don't do this
}
```

#### Type Safety (TypeScript)

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

## Examples

### Complete E-commerce Order Feature

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
    console.error('[Order Error]', error)

    // Retry on transient errors
    if (error.code === 'ETIMEDOUT' && ctx.retryCount < 3) {
      ctx.retryCount++
      return retry()  // Immediate retry
    }

    // Rollback
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
    throw new ValidationError('Order must contain at least one item')
  }

  if (!shippingAddress) {
    throw new ValidationError('Shipping address is required')
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
      throw new Error(`Insufficient stock for ${item.productId}`)
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
    description: `Order ${ctx.orderId}`,
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
    subject: 'Order Confirmation',
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

## See Also

- [README](../README.md) - Getting started guide
- [Feature-First Architecture](./feature-first-architecture.md) - Architecture guide
- [Convention over Configuration](./convention-over-configuration.md) - Convention guide
- [Path Aliasing](./path-aliasing.md) - Path aliasing strategies
