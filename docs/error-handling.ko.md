# 에러 처리 (Error Handling)

express-numflow는 **Express 스타일의 단순한 에러 처리**를 채택합니다. 복잡한 내장 에러 클래스 대신 표준 JavaScript Error에 `statusCode` 속성을 추가하는 방식입니다.

## 목차

- [Express 스타일 에러 처리](#express-스타일-에러-처리)
- [에러 처리 핸들러](#에러-처리-핸들러)
- [커스텀 에러 클래스](#커스텀-에러-클래스)
- [FeatureError와 Step 디버깅](#featureerror와-step-디버깅)
- [에러 유틸리티](#에러-유틸리티)
- [개발 vs 프로덕션](#개발-vs-프로덕션)

---

## Express 스타일 에러 처리

### 기본 사용법

가장 간단한 방법: 표준 Error에 `statusCode`를 추가합니다.

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

### statusCode 없이 던지기

`statusCode` 없이 던지면 기본값 500으로 처리됩니다.

```javascript
// 500 Internal Server Error로 처리됨
throw new Error('Something went wrong')
```

### 추가 속성 사용

필요한 속성을 자유롭게 추가하세요.

```javascript
// features/api/users/@post/steps/100-validate.js
module.exports = async (ctx, req, res) => {
  const { email, password } = req.body

  const errors = {}
  if (!email?.includes('@')) {
    errors.email = ['유효한 이메일을 입력하세요']
  }
  if (!password || password.length < 8) {
    errors.password = ['비밀번호는 8자 이상이어야 합니다']
  }

  if (Object.keys(errors).length > 0) {
    const error = new Error('검증 실패')
    error.statusCode = 400
    error.validationErrors = errors  // 추가 속성
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
    const error = new Error('재고가 부족합니다')
    error.statusCode = 400
    error.code = 'OUT_OF_STOCK'  // 비즈니스 에러 코드
    throw error
  }

  ctx.stockChecked = true
}
```

---

## 에러 처리 핸들러

### Feature의 onError 핸들러

해당 Feature에서만 에러를 처리합니다. **ctx에 접근 가능**하여 트랜잭션 롤백 등을 할 수 있습니다.

```javascript
// features/api/orders/@post/index.js
const { feature } = require('express-numflow')

module.exports = feature({
  contextInitializer: async (ctx, req, res) => {
    ctx.transaction = await db.beginTransaction()
  },

  onError: async (error, ctx, req, res) => {
    console.log('에러 발생:', error.message)

    // 트랜잭션 롤백
    if (ctx.transaction) {
      await ctx.transaction.rollback()
    }

    // 직접 응답 보내기
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message
    })
  }
})
```

### Express 글로벌 에러 핸들러

Express 에러 처리 미들웨어를 사용하여 모든 Feature에서 발생하는 에러를 한 곳에서 처리합니다.

```javascript
// app.js
const express = require('express')
const { createFeatureRouter } = require('express-numflow')

const app = express()
app.use(express.json())

const featureRouter = await createFeatureRouter('./features')
app.use(featureRouter)

// 글로벌 에러 핸들러
app.use((err, req, res, next) => {
  console.error('에러:', err.message)

  // 간단한 패턴: err.statusCode || 500
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

### onError + Express 에러 핸들러 함께 사용하기

```javascript
// features/api/orders/@post/index.js - cleanup만 수행
const { feature } = require('express-numflow')

module.exports = feature({
  onError: async (error, ctx, req, res) => {
    // 트랜잭션 롤백만 수행
    if (ctx.transaction) {
      await ctx.transaction.rollback()
    }

    // 글로벌 핸들러로 위임 (에러 다시 던지기)
    throw error
  }
})

// app.js - 통합 응답 처리
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500
  res.status(statusCode).json({
    success: false,
    error: err.message
  })
})
```

### 재시도 (Retry) 기능

```javascript
// features/api/chat/@post/index.js
const { feature, retry } = require('express-numflow')

module.exports = feature({
  contextInitializer: (ctx, req, res) => {
    ctx.provider = 'openai'
    ctx.retryCount = 0
  },

  onError: async (error, ctx, req, res) => {
    // Rate limit 에러 -> Provider 변경 후 재시도
    if (error.message.includes('rate_limit')) {
      const providers = ['openai', 'anthropic', 'gemini']
      const currentIndex = providers.indexOf(ctx.provider)

      if (currentIndex < providers.length - 1) {
        ctx.provider = providers[currentIndex + 1]
        return retry({ delay: 500 })  // 0.5초 후 재시도
      }
    }

    // Timeout 에러 -> Exponential backoff
    if (error.message.includes('timeout')) {
      ctx.retryCount++
      if (ctx.retryCount <= 3) {
        const delay = 1000 * Math.pow(2, ctx.retryCount - 1)  // 1s, 2s, 4s
        return retry({ delay, maxAttempts: 3 })
      }
    }

    // 재시도 불가능 -> 글로벌 핸들러로
    throw error
  }
})
```

---

## 커스텀 에러 클래스

비즈니스 도메인에 맞는 커스텀 에러 클래스를 만들 수 있습니다. `statusCode` 속성만 있으면 됩니다.

### 커스텀 에러 클래스 만들기

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

### Step에서 사용하기

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
      throw new PaymentError('결제 실패', {
        transactionId: result.transactionId,
        reason: result.declineCode,
        refundable: false
      })
    }

    ctx.paymentResult = result

  } catch (error) {
    // Stripe API 에러 래핑
    if (error.type === 'StripeAPIError') {
      throw new ExternalAPIError('결제 서비스 연결 실패', {
        provider: 'stripe',
        originalStatus: error.statusCode,
        retryable: error.statusCode >= 500
      })
    }
    throw error
  }
}
```

### Express 글로벌 핸들러에서 처리

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

  // 각 에러 타입의 커스텀 속성 포함
  if (err.validationErrors) response.error.fields = err.validationErrors
  if (err.code) response.error.code = err.code
  if (err.transactionId) response.error.transactionId = err.transactionId
  if (err.reason) response.error.reason = err.reason
  if (err.provider) response.error.provider = err.provider

  res.status(statusCode).json(response)
})
```

---

## FeatureError와 Step 디버깅

### FeatureError란?

Step에서 에러가 발생하면 express-numflow는 **자동으로** `FeatureError`로 래핑합니다. 이를 통해 어떤 Step에서 에러가 발생했는지 추적할 수 있습니다.

```
원래 에러 (ValidationError, Error 등)
    ↓
FeatureError (Step 정보 포함)
    ↓
onError 또는 Express 에러 미들웨어로 전달
```

### Step 정보 접근

`FeatureError`의 `step` 속성으로 에러가 발생한 Step 정보에 접근할 수 있습니다.

```javascript
// app.js
app.use((err, req, res, next) => {
  // Step 정보 접근
  if (err.step) {
    console.log(`에러 발생 Step: ${err.step.number} - ${err.step.name}`)
    // 출력: "에러 발생 Step: 200 - 200-process.js"
  }

  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message
  })
})
```

### 원래 에러 접근

`FeatureError`의 `originalError` 속성으로 원래 에러에 접근할 수 있습니다.

```javascript
// app.js
app.use((err, req, res, next) => {
  // 원래 에러의 추가 속성 접근
  const originalError = err.originalError || err

  const response = {
    success: false,
    error: originalError.message,
    statusCode: originalError.statusCode || 500
  }

  // 원래 에러의 커스텀 속성 포함
  if (originalError.validationErrors) {
    response.validationErrors = originalError.validationErrors
  }
  if (originalError.code) {
    response.code = originalError.code
  }

  res.status(response.statusCode).json(response)
})
```

### onError에서 사용

```javascript
const { feature, retry } = require('express-numflow')

module.exports = feature({
  onError: async (error, ctx, req, res) => {
    // 원래 에러의 code 속성으로 분기
    const code = error.code || error.originalError?.code

    switch (code) {
      case 'OUT_OF_STOCK':
        await inventoryService.releaseReservation(ctx.reservationId)
        break

      case 'PAYMENT_DECLINED':
        await logService.logPaymentFailure(ctx.paymentId, error)
        break
    }

    // 재시도 가능한 에러인지 확인
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

## 개발 vs 프로덕션

```javascript
// app.js
const express = require('express')
const { createFeatureRouter } = require('express-numflow')

const app = express()
const isProd = process.env.NODE_ENV === 'production'

app.use(express.json())

const featureRouter = await createFeatureRouter('./features')
app.use(featureRouter)

// 글로벌 에러 핸들러
app.use((err, req, res, next) => {
  // 원래 에러 추출
  const originalError = err.originalError || err
  const statusCode = originalError.statusCode || 500

  // 로깅
  if (isProd) {
    errorTracker.capture(err, { req })
  } else {
    console.error(err.stack)
  }

  // 응답
  res.status(statusCode).json({
    success: false,
    error: originalError.message,
    ...(originalError.validationErrors && { validationErrors: originalError.validationErrors }),
    ...(originalError.code && { code: originalError.code }),
    // Step 정보 (개발 환경에서만)
    ...(!isProd && err.step && { step: { number: err.step.number, name: err.step.name } }),
    // 스택 트레이스 (개발 환경에서만)
    ...(!isProd && { stack: originalError.stack })
  })
})
```

---

## 요약

### Express 스타일 에러 처리

```javascript
// 가장 단순한 방법
const error = new Error('Not found')
error.statusCode = 404
throw error
```

### 에러 처리 흐름

```
Step에서 throw error
         |
    FeatureError로 wrap (Step 정보 포함)
         |
    Feature에 onError 있음?
         |
    +----+----+
   Yes        No
    |          |
onError()   Express 에러 미들웨어로 전달
실행
    |
    +-- 응답 전송 -> 끝
    |
    +-- retry() 반환 -> 재시도
    |
    +-- throw error -> Express로 전달
```

### 내보내는 것들

```javascript
const {
  feature,           // Feature 생성
  retry,             // 재시도 신호
} = require('express-numflow')
```

### 핸들러 비교

| 핸들러 | 범위 | ctx 접근 | 용도 |
|--------|------|----------|------|
| **onError** | Feature 전용 | 가능 | 트랜잭션 롤백, 재시도 |
| **Express 미들웨어** | 전체 앱 | 불가 | 통합 로깅, 응답 포맷 |

---

## 관련 문서

- [API 레퍼런스](./api-reference.ko.md) - 전체 API 문서
- [Feature-First 아키텍처](./feature-first-architecture.ko.md) - 아키텍처 가이드
- [Convention over Configuration](./convention-over-configuration.ko.md) - 컨벤션 가이드

---

**마지막 업데이트**: 2025-11-27
