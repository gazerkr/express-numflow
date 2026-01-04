# Error Handling

express-numflow adopts **Express-style simple error handling**. Instead of complex built-in error classes, simply add a `statusCode` property to standard JavaScript Error.

## Table of Contents

- [Express-Style Error Handling](#express-style-error-handling)
- [Error Handlers](#error-handlers)
- [Custom Error Classes](#custom-error-classes)
- [FeatureError and Step Debugging](#featureerror-and-step-debugging)
- [Error Utilities](#error-utilities)
- [Development vs Production](#development-vs-production)

---

## Express-Style Error Handling

### Basic Usage

The simplest approach: add `statusCode` to a standard Error.

```javascript
// features/api/users/@get/steps/100-fetch.js
module.exports = async (ctx, req, res) => {
  const user = await db.findUser(req.params.id)

  if (!user) {
    const error = new Error('User not found')
    error.statusCode = 404
    throw error
  }

  ctx.user = user
}
```

### Throwing Without statusCode

Throwing without `statusCode` defaults to 500.

```javascript
// Treated as 500 Internal Server Error
throw new Error('Something went wrong')
```

### Using Additional Properties

Add any properties you need.

```javascript
// features/api/users/@post/steps/100-validate.js
module.exports = async (ctx, req, res) => {
  const { email, password } = req.body

  const errors = {}
  if (!email?.includes('@')) {
    errors.email = ['Please enter a valid email']
  }
  if (!password || password.length < 8) {
    errors.password = ['Password must be at least 8 characters']
  }

  if (Object.keys(errors).length > 0) {
    const error = new Error('Validation failed')
    error.statusCode = 400
    error.validationErrors = errors  // Additional property
    throw error
  }

  ctx.validatedData = { email, password }
}
```

```javascript
// features/api/orders/@post/steps/200-check-stock.js
module.exports = async (ctx, req, res) => {
  const stock = await db.getStock(ctx.productId)

  if (stock < ctx.quantity) {
    const error = new Error('Insufficient stock')
    error.statusCode = 400
    error.code = 'OUT_OF_STOCK'  // Business error code
    throw error
  }

  ctx.stockChecked = true
}
```

---

## Error Handlers

### Feature's onError Handler

Handles errors only within that Feature. **Has access to ctx** for transaction rollback, etc.

```javascript
// features/api/orders/@post/index.js
const { feature } = require('express-numflow')

module.exports = feature({
  contextInitializer: async (ctx, req, res) => {
    ctx.transaction = await db.beginTransaction()
  },

  onError: async (error, ctx, req, res) => {
    console.log('Error occurred:', error.message)

    // Rollback transaction
    if (ctx.transaction) {
      await ctx.transaction.rollback()
    }

    // Send response directly
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message
    })
  }
})
```

### Express Global Error Handler

Handle all errors from Features in one place using Express error-handling middleware.

```javascript
// app.js
const express = require('express')
const { createFeatureRouter } = require('express-numflow')

const app = express()
app.use(express.json())

const featureRouter = await createFeatureRouter('./features')
app.use(featureRouter)

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message)

  // Simple pattern: err.statusCode || 500
  const statusCode = err.statusCode || 500

  res.status(statusCode).json({
    success: false,
    error: err.message,
    ...(err.validationErrors && { validationErrors: err.validationErrors }),
    ...(err.code && { code: err.code })
  })
})

app.listen(3000)
```

### Using onError + Express Error Handler Together

```javascript
// features/api/orders/@post/index.js - cleanup only
const { feature } = require('express-numflow')

module.exports = feature({
  onError: async (error, ctx, req, res) => {
    // Only perform transaction rollback
    if (ctx.transaction) {
      await ctx.transaction.rollback()
    }

    // Delegate to global handler by re-throwing
    throw error
  }
})

// app.js - unified response handling
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500
  res.status(statusCode).json({
    success: false,
    error: err.message
  })
})
```

### Retry Functionality

```javascript
// features/api/chat/@post/index.js
const { feature, retry } = require('express-numflow')

module.exports = feature({
  contextInitializer: (ctx, req, res) => {
    ctx.provider = 'openai'
    ctx.retryCount = 0
  },

  onError: async (error, ctx, req, res) => {
    // Rate limit error -> Change provider and retry
    if (error.message.includes('rate_limit')) {
      const providers = ['openai', 'anthropic', 'gemini']
      const currentIndex = providers.indexOf(ctx.provider)

      if (currentIndex < providers.length - 1) {
        ctx.provider = providers[currentIndex + 1]
        return retry({ delay: 500 })  // Retry after 0.5 seconds
      }
    }

    // Timeout error -> Exponential backoff
    if (error.message.includes('timeout')) {
      ctx.retryCount++
      if (ctx.retryCount <= 3) {
        const delay = 1000 * Math.pow(2, ctx.retryCount - 1)  // 1s, 2s, 4s
        return retry({ delay, maxAttempts: 3 })
      }
    }

    // Cannot retry -> Delegate to global handler
    throw error
  }
})
```

---

## Custom Error Classes

Create custom error classes that match your business domain. Just include a `statusCode` property.

### Creating Custom Error Classes

```javascript
// errors/PaymentError.js
class PaymentError extends Error {
  constructor(message, { transactionId, reason, refundable = false }) {
    super(message)
    this.name = 'PaymentError'
    this.statusCode = 402  // Payment Required
    this.transactionId = transactionId
    this.reason = reason
    this.refundable = refundable
  }
}

module.exports = { PaymentError }
```

```javascript
// errors/ValidationError.js
class ValidationError extends Error {
  constructor(message, errors = {}) {
    super(message)
    this.name = 'ValidationError'
    this.statusCode = 400
    this.validationErrors = errors
  }
}

module.exports = { ValidationError }
```

```javascript
// errors/ExternalAPIError.js
class ExternalAPIError extends Error {
  constructor(message, { provider, originalStatus, retryable = false }) {
    super(message)
    this.name = 'ExternalAPIError'
    this.statusCode = 502  // Bad Gateway
    this.provider = provider
    this.originalStatus = originalStatus
    this.retryable = retryable
  }
}

module.exports = { ExternalAPIError }
```

### Using in Steps

```javascript
// features/api/payments/@post/steps/200-process-payment.js
const { PaymentError } = require('../../../../errors/PaymentError')
const { ExternalAPIError } = require('../../../../errors/ExternalAPIError')

module.exports = async (ctx, req, res) => {
  try {
    const result = await stripeService.charge({
      amount: ctx.amount,
      cardToken: ctx.cardToken
    })

    if (!result.success) {
      throw new PaymentError('Payment failed', {
        transactionId: result.transactionId,
        reason: result.declineCode,
        refundable: false
      })
    }

    ctx.paymentResult = result

  } catch (error) {
    // Wrap Stripe API errors
    if (error.type === 'StripeAPIError') {
      throw new ExternalAPIError('Payment service connection failed', {
        provider: 'stripe',
        originalStatus: error.statusCode,
        retryable: error.statusCode >= 500
      })
    }
    throw error
  }
}
```

### Handling in Express Global Handler

```javascript
// app.js
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500

  const response = {
    success: false,
    error: {
      type: err.name,
      message: err.message
    }
  }

  // Include custom properties for each error type
  if (err.validationErrors) response.error.fields = err.validationErrors
  if (err.code) response.error.code = err.code
  if (err.transactionId) response.error.transactionId = err.transactionId
  if (err.reason) response.error.reason = err.reason
  if (err.provider) response.error.provider = err.provider

  res.status(statusCode).json(response)
})
```

---

## FeatureError and Step Debugging

### What is FeatureError?

When an error occurs in a Step, express-numflow **automatically** wraps it in a `FeatureError`. This allows you to track which Step caused the error.

```
Original error (ValidationError, Error, etc.)
    |
FeatureError (includes Step info)
    |
Passed to onError or Express error middleware
```

### Accessing Step Information

Use the `step` property of `FeatureError` to access information about the Step where the error occurred.

```javascript
// app.js
app.use((err, req, res, next) => {
  // Access Step info
  if (err.step) {
    console.log(`Error in Step: ${err.step.number} - ${err.step.name}`)
    // Output: "Error in Step: 200 - 200-process.js"
  }

  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message
  })
})
```

### Accessing Original Error

Use the `originalError` property of `FeatureError` to access the original error.

```javascript
// app.js
app.use((err, req, res, next) => {
  // Access original error's additional properties
  const originalError = err.originalError || err

  const response = {
    success: false,
    error: originalError.message,
    statusCode: originalError.statusCode || 500
  }

  // Include original error's custom properties
  if (originalError.validationErrors) {
    response.validationErrors = originalError.validationErrors
  }
  if (originalError.code) {
    response.code = originalError.code
  }

  res.status(response.statusCode).json(response)
})
```

### Using in onError

```javascript
const { feature, retry } = require('express-numflow')

module.exports = feature({
  onError: async (error, ctx, req, res) => {
    // Branch by original error's code property
    const code = error.code || error.originalError?.code

    switch (code) {
      case 'OUT_OF_STOCK':
        await inventoryService.releaseReservation(ctx.reservationId)
        break

      case 'PAYMENT_DECLINED':
        await logService.logPaymentFailure(ctx.paymentId, error)
        break
    }

    // Check if error is retryable
    const retryable = error.retryable || error.originalError?.retryable
    if (retryable && ctx.retryCount < 3) {
      ctx.retryCount++
      return retry({ delay: 1000 })
    }

    throw error
  }
})
```

---

## Development vs Production

```javascript
// app.js
const express = require('express')
const { createFeatureRouter } = require('express-numflow')

const app = express()
const isProd = process.env.NODE_ENV === 'production'

app.use(express.json())

const featureRouter = await createFeatureRouter('./features')
app.use(featureRouter)

// Global error handler
app.use((err, req, res, next) => {
  // Extract original error
  const originalError = err.originalError || err
  const statusCode = originalError.statusCode || 500

  // Logging
  if (isProd) {
    errorTracker.capture(err, { req })
  } else {
    console.error(err.stack)
  }

  // Response
  res.status(statusCode).json({
    success: false,
    error: originalError.message,
    ...(originalError.validationErrors && { validationErrors: originalError.validationErrors }),
    ...(originalError.code && { code: originalError.code }),
    // Step info (development only)
    ...(!isProd && err.step && { step: { number: err.step.number, name: err.step.name } }),
    // Stack trace (development only)
    ...(!isProd && { stack: originalError.stack })
  })
})
```

---

## Summary

### Express-Style Error Handling

```javascript
// The simplest approach
const error = new Error('Not found')
error.statusCode = 404
throw error
```

### Error Flow

```
throw error in Step
         |
    Wrap with FeatureError (includes Step info)
         |
    Feature has onError?
         |
    +----+----+
   Yes        No
    |          |
onError()   Pass to Express error middleware
executed
    |
    +-- Send response -> End
    |
    +-- Return retry() -> Retry
    |
    +-- throw error -> Pass to Express
```

### Exports

```javascript
const {
  feature,           // Create Feature
  retry,             // Retry signal
} = require('express-numflow')
```

### Handler Comparison

| Handler | Scope | ctx Access | Use Case |
|---------|-------|------------|----------|
| **onError** | Feature only | Yes | Transaction rollback, retry |
| **Express middleware** | Entire app | No | Unified logging, response format |

---

## See Also

- [API Reference](./api-reference.md) - Complete API documentation
- [Feature-First Architecture](./feature-first-architecture.md) - Architecture guide
- [Convention over Configuration](./convention-over-configuration.md) - Convention guide

---

**Last Updated**: 2025-11-27
