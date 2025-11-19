# Feature-First 아키텍처 가이드

## 목차

- [Feature-First 아키텍처란?](#feature-first-아키텍처란)
- [왜 Feature-First인가?](#왜-feature-first인가)
- [핵심 개념](#핵심-개념)
- [구조와 패턴](#구조와-패턴)
- [실제 예제](#실제-예제)
- [베스트 프랙티스](#베스트-프랙티스)
- [일반적인 패턴](#일반적인-패턴)
- [마이그레이션 가이드](#마이그레이션-가이드)

---

## Feature-First 아키텍처란?

**Feature-First 아키텍처**는 기술적 레이어가 아닌 **비즈니스 기능별로** 코드를 구조화하는 조직 패턴입니다. 각 Feature는 특정 비즈니스 기능을 처리하는 데 필요한 모든 로직, Steps, Tasks를 포함하는 독립적인 단위입니다.

### 전통적인 레이어 기반 접근 방식

```
src/
├── controllers/
│   ├── userController.js
│   ├── orderController.js
│   └── productController.js
├── services/
│   ├── userService.js
│   ├── orderService.js
│   └── productService.js
├── models/
│   ├── User.js
│   ├── Order.js
│   └── Product.js
└── routes/
    ├── userRoutes.js
    ├── orderRoutes.js
    └── productRoutes.js
```

**문제점**: 단일 기능(예: "주문 생성")을 이해하거나 수정하려면 4개 이상의 다른 디렉토리를 오가야 합니다.

### Feature-First 접근 방식

```
features/
├── users/
│   ├── @post/              # 사용자 생성
│   ├── [id]/@get/          # 사용자 조회
│   └── [id]/@put/          # 사용자 수정
├── orders/
│   ├── @post/              # 주문 생성
│   │   ├── steps/
│   │   │   ├── 100-validate.js
│   │   │   ├── 200-check-stock.js
│   │   │   └── 300-create-order.js
│   │   └── async-tasks/
│   │       └── send-confirmation-email.js
│   ├── @get/               # 주문 목록
│   └── [id]/@get/          # 주문 조회
└── products/
    ├── @get/               # 상품 목록
    └── [id]/@get/          # 상품 조회
```

**장점**: "주문 생성"과 관련된 모든 것이 한 곳에 있습니다: `features/orders/@post/`

---

## 왜 Feature-First인가?

### 1. **동작의 지역성 (Locality of Behavior)**

관련된 코드가 함께 있습니다. 기능을 이해하거나 수정하려면 한 디렉토리만 보면 됩니다.

```
orders/@post/
├── steps/
│   ├── 100-validate.js          ← 유효성 검증 로직
│   ├── 200-check-stock.js       ← 비즈니스 로직
│   ├── 300-reserve-inventory.js ← 트랜잭션 로직
│   └── 400-create-order.js      ← 데이터베이스 로직
└── async-tasks/
    ├── send-confirmation-email.js ← 백그라운드 작업
    └── update-analytics.js         ← 백그라운드 작업
```

### 2. **쉬운 추론**

파일 간을 오가지 않고도 기능의 완전한 동작을 이해할 수 있습니다:
- **이 기능은 무엇을 하나요?** 순서대로 Steps를 읽으세요
- **응답 후에 무슨 일이 일어나나요?** async-tasks를 확인하세요
- **유효성 검증을 추가하려면?** Step 파일을 추가하세요

### 3. **더 나은 팀 협업**

서로 다른 개발자가 서로 다른 기능을 작업해도 충돌이 없습니다:
- 개발자 A는 `orders/@post/` 작업
- 개발자 B는 `products/@get/` 작업
- 대부분의 경우 머지 충돌 제로

### 4. **확장성**

애플리케이션이 성장함에 따라:
- **레이어 기반**: 파일이 커지고, 디렉토리가 압도적으로 많아짐
- **Feature-First**: 새 기능은 새 디렉토리, 기존 기능은 격리된 상태 유지

### 5. **쉬운 테스트**

각 기능을 독립적으로 테스트할 수 있습니다:
```javascript
// "주문 생성" 기능 전체를 테스트
const createOrderFeature = require('./features/orders/@post')
```

---

## 핵심 개념

### 1. Feature

**Feature**는 하나의 HTTP 엔드포인트를 처리하는 독립적인 단위입니다.

**구조:**
```
feature-name/
├── @method/              # HTTP 메서드 (필수)
│   ├── index.js          # Feature 설정 (선택사항)
│   ├── steps/            # 순차 실행 Steps
│   │   ├── 100-xxx.js
│   │   ├── 200-xxx.js
│   │   └── 300-xxx.js
│   └── async-tasks/      # 백그라운드 작업 (선택사항)
│       ├── task1.js
│       └── task2.js
```

### 2. Steps

**Steps**는 요청을 처리하기 위해 **순차적으로** 실행되는 함수입니다.

**특징:**
- 숫자 순서대로 실행 (100 → 200 → 300)
- 공통 `ctx` (context) 객체 공유
- `req`와 `res`에 접근 가능
- 에러를 던져서 실행 중지 가능

**예제:**
```javascript
// steps/100-validate.js
module.exports = async (ctx, req, res) => {
  if (!req.body.email) {
    throw new Error('이메일이 필요합니다')
  }
  ctx.email = req.body.email
}

// steps/200-create-user.js
module.exports = async (ctx, req, res) => {
  ctx.user = await db.createUser({ email: ctx.email })
}

// steps/300-send-response.js
module.exports = async (ctx, req, res) => {
  res.status(201).json({
    success: true,
    user: ctx.user
  })
}
```

### 3. Context (`ctx`)

**context** 객체는 모든 Steps 간에 공유됩니다:
- 각 요청마다 새로 초기화
- Steps 간 데이터 전달에 사용
- 변경 가능 (Steps가 수정 가능)

**베스트 프랙티스:**
```javascript
// [좋음]: ctx를 사용해 데이터 전달
ctx.userId = user.id
ctx.orderData = { ... }

// [나쁨]: 전역 변수나 모듈 레벨 상태 사용
global.userId = user.id  // 이렇게 하지 마세요!
```

### 4. Async Tasks

**Async Tasks**는 응답이 전송된 후 백그라운드에서 실행됩니다:
- HTTP 응답을 차단하지 않음
- 이메일, 로깅, 분석 등에 완벽
- `ctx`에 접근 가능 (하지만 `req`나 `res`는 불가)

**예제:**
```javascript
// async-tasks/send-welcome-email.js
module.exports = async (ctx) => {
  await sendEmail({
    to: ctx.user.email,
    subject: '환영합니다!',
    body: `안녕하세요 ${ctx.user.name}님!`
  })
}
```

---

## 구조와 패턴

### HTTP 메서드

`@` 접두사를 사용해 HTTP 메서드를 정의하세요:

```
@get/     → GET
@post/    → POST
@put/     → PUT
@patch/   → PATCH
@delete/  → DELETE
```

**예제:**
```
users/
├── @get/      → GET /users (전체 조회)
├── @post/     → POST /users (생성)
└── [id]/
    ├── @get/     → GET /users/:id
    ├── @put/     → PUT /users/:id
    └── @delete/  → DELETE /users/:id
```

### 동적 라우트

라우트 파라미터는 `[param]` 폴더를 사용하세요:

```
posts/[postId]/comments/[commentId]/@get/
→ GET /posts/:postId/comments/:commentId
```

**Steps에서 파라미터 접근:**
```javascript
module.exports = async (ctx, req, res) => {
  const { postId, commentId } = req.params
  // 사용...
}
```

### 중첩된 Features

관련된 기능들을 함께 그룹화:

```
api/
├── v1/
│   ├── users/
│   │   ├── @get/
│   │   └── @post/
│   └── orders/
│       ├── @get/
│       └── @post/
└── v2/
    └── users/
        ├── @get/
        └── @post/
```

**마운트:**
```javascript
const apiV1Router = await createFeatureRouter('./features/api/v1')
app.use('/api/v1', apiV1Router)

const apiV2Router = await createFeatureRouter('./features/api/v2')
app.use('/api/v2', apiV2Router)
```

---

## 실제 예제

### 예제 1: 사용자 등록

**Feature:** `users/@post/`

**구조:**
```
users/@post/
├── steps/
│   ├── 100-validate-email.js
│   ├── 200-check-existing-user.js
│   ├── 300-hash-password.js
│   ├── 400-create-user.js
│   ├── 500-generate-token.js
│   └── 600-send-response.js
└── async-tasks/
    ├── send-welcome-email.js
    └── notify-admin.js
```

**Steps:**

```javascript
// 100-validate-email.js
module.exports = async (ctx, req, res) => {
  const { email, password } = req.body

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: '잘못된 이메일 형식' })
  }

  if (!password || password.length < 8) {
    return res.status(400).json({ error: '비밀번호는 8자 이상이어야 합니다' })
  }

  ctx.email = email
  ctx.password = password
}

// 200-check-existing-user.js
module.exports = async (ctx, req, res) => {
  const existing = await db.users.findByEmail(ctx.email)

  if (existing) {
    return res.status(409).json({ error: '이미 등록된 이메일입니다' })
  }
}

// 300-hash-password.js
const bcrypt = require('bcrypt')

module.exports = async (ctx, req, res) => {
  ctx.hashedPassword = await bcrypt.hash(ctx.password, 10)
}

// 400-create-user.js
module.exports = async (ctx, req, res) => {
  ctx.user = await db.users.create({
    email: ctx.email,
    password: ctx.hashedPassword
  })
}

// 500-generate-token.js
const jwt = require('jsonwebtoken')

module.exports = async (ctx, req, res) => {
  ctx.token = jwt.sign(
    { userId: ctx.user.id },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
}

// 600-send-response.js
module.exports = async (ctx, req, res) => {
  res.status(201).json({
    success: true,
    user: {
      id: ctx.user.id,
      email: ctx.user.email
    },
    token: ctx.token
  })
}
```

**Async Tasks:**

```javascript
// async-tasks/send-welcome-email.js
module.exports = async (ctx) => {
  await emailService.send({
    to: ctx.email,
    template: 'welcome',
    data: { name: ctx.user.name }
  })
}

// async-tasks/notify-admin.js
module.exports = async (ctx) => {
  await slack.notify({
    channel: '#new-users',
    message: `새 사용자 등록: ${ctx.email}`
  })
}
```

### 예제 2: 파일 업로드

**Feature:** `uploads/@post/`

**구조:**
```
uploads/@post/
├── steps/
│   ├── 100-validate-file.js
│   ├── 200-upload-to-s3.js
│   ├── 300-create-record.js
│   └── 400-send-response.js
└── async-tasks/
    ├── generate-thumbnail.js
    └── scan-virus.js
```

**Steps:**

```javascript
// 100-validate-file.js
module.exports = async (ctx, req, res) => {
  const file = req.file

  if (!file) {
    return res.status(400).json({ error: '파일이 업로드되지 않았습니다' })
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
  if (!allowedTypes.includes(file.mimetype)) {
    return res.status(400).json({ error: '잘못된 파일 형식' })
  }

  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    return res.status(400).json({ error: '파일 크기가 너무 큽니다' })
  }

  ctx.file = file
}

// 200-upload-to-s3.js
const AWS = require('aws-sdk')
const s3 = new AWS.S3()

module.exports = async (ctx, req, res) => {
  const key = `uploads/${Date.now()}-${ctx.file.originalname}`

  await s3.upload({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: ctx.file.buffer,
    ContentType: ctx.file.mimetype
  }).promise()

  ctx.s3Key = key
  ctx.url = `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${key}`
}

// 300-create-record.js
module.exports = async (ctx, req, res) => {
  ctx.upload = await db.uploads.create({
    userId: req.user.id,
    filename: ctx.file.originalname,
    s3Key: ctx.s3Key,
    url: ctx.url,
    size: ctx.file.size,
    mimetype: ctx.file.mimetype
  })
}

// 400-send-response.js
module.exports = async (ctx, req, res) => {
  res.status(201).json({
    success: true,
    upload: {
      id: ctx.upload.id,
      url: ctx.url,
      filename: ctx.file.originalname
    }
  })
}
```

---

## 베스트 프랙티스

### 1. Steps를 작고 집중되게 유지

각 Step은 **한 가지 일**만 해야 합니다:

```javascript
// [좋음]: 단일 책임
// 100-validate-email.js
module.exports = async (ctx, req, res) => {
  if (!req.body.email || !req.body.email.includes('@')) {
    return res.status(400).json({ error: '잘못된 이메일' })
  }
  ctx.email = req.body.email
}

// [나쁨]: 여러 책임
// 100-validate-and-create-user.js
module.exports = async (ctx, req, res) => {
  // 유효성 검증
  if (!req.body.email) { ... }

  // 해싱
  const hashed = await bcrypt.hash(req.body.password, 10)

  // 데이터베이스
  const user = await db.create({ ... })

  // 응답
  res.json({ ... })
}
```

### 2. 설명적인 Step 이름 사용

파일 이름은 Step이 무엇을 하는지 설명해야 합니다:

```javascript
// [좋음]
100-validate-order-data.js
200-check-inventory-availability.js
300-calculate-total-price.js
400-apply-discount-code.js
500-create-order-in-database.js

// [나쁨]
100-validate.js
200-check.js
300-calculate.js
400-apply.js
500-create.js
```

### 3. 간격을 두고 Steps 번호 매기기

미래의 Steps를 위한 공간을 남겨두세요:

```javascript
// [좋음]: 새 Steps 삽입이 쉬움
100-validate.js
200-check-stock.js
300-create-order.js

// 100과 200 사이에 Step을 추가하고 싶다면?
100-validate.js
150-check-user-limit.js  ← 쉽습니다!
200-check-stock.js
300-create-order.js

// [나쁨]: 삽입이 어려움
1-validate.js
2-check-stock.js
3-create-order.js
// 이제 어떻게? 1.5-xxx.js?
```

### 4. 유효성 검증은 조기 반환

유효성 검증이 실패하면 즉시 반환:

```javascript
module.exports = async (ctx, req, res) => {
  if (!req.body.email) {
    return res.status(400).json({ error: '이메일이 필요합니다' })
  }

  if (!req.body.password) {
    return res.status(400).json({ error: '비밀번호가 필요합니다' })
  }

  // 유효한 데이터로 계속 진행
  ctx.email = req.body.email
  ctx.password = req.body.password
}
```

### 5. 데이터 흐름에는 Context 사용

Steps 간 데이터 전달에는 항상 `ctx` 사용:

```javascript
// Step 1
module.exports = async (ctx, req, res) => {
  ctx.userId = req.user.id
  ctx.productId = req.body.productId
}

// Step 2 (Step 1의 데이터 사용)
module.exports = async (ctx, req, res) => {
  const product = await db.products.findById(ctx.productId)
  ctx.product = product
}

// Step 3 (Step 1과 2의 데이터 사용)
module.exports = async (ctx, req, res) => {
  const order = await db.orders.create({
    userId: ctx.userId,
    productId: ctx.product.id,
    price: ctx.product.price
  })
  ctx.order = order
}
```

### 6. Feature당 하나의 응답

**마지막 Step**에서 응답을 보내고, async tasks에서는 보내지 마세요:

```javascript
// [좋음]: 마지막 Step에서 응답 전송
// steps/300-send-response.js
module.exports = async (ctx, req, res) => {
  res.json({ success: true, data: ctx.result })
}

// [나쁨]: async tasks에서 응답 전송하지 마세요
// async-tasks/some-task.js
module.exports = async (ctx) => {
  // 이렇게 하지 마세요 - res는 사용 불가!
  // res.json({ ... })
}
```

### 7. 에러를 우아하게 처리

try-catch 또는 에러 핸들러 사용:

```javascript
// 옵션 1: Steps에서 try-catch
module.exports = async (ctx, req, res) => {
  try {
    ctx.user = await db.users.findById(req.params.id)
  } catch (error) {
    return res.status(500).json({
      error: '사용자 조회 실패',
      details: error.message
    })
  }
}

// 옵션 2: index.js에서 커스텀 에러 핸들러
module.exports = feature({
  onError: async (error, ctx, req, res) => {
    console.error('Feature 에러:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})
```

---

## 일반적인 패턴

### 패턴 1: 페이지네이션

```javascript
// features/posts/@get/steps/100-fetch-posts.js
module.exports = async (ctx, req, res) => {
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 20
  const offset = (page - 1) * limit

  ctx.posts = await db.posts.findAll({ limit, offset })
  ctx.total = await db.posts.count()
  ctx.page = page
  ctx.limit = limit
}

// features/posts/@get/steps/200-send-response.js
module.exports = async (ctx, req, res) => {
  res.json({
    success: true,
    data: ctx.posts,
    pagination: {
      page: ctx.page,
      limit: ctx.limit,
      total: ctx.total,
      pages: Math.ceil(ctx.total / ctx.limit)
    }
  })
}
```

### 패턴 2: 인증 미들웨어

```javascript
// features/protected/@get/steps/100-authenticate.js
const jwt = require('jsonwebtoken')

module.exports = async (ctx, req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({ error: '토큰이 제공되지 않았습니다' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    ctx.userId = decoded.userId
  } catch (error) {
    return res.status(401).json({ error: '잘못된 토큰' })
  }
}

// features/protected/@get/steps/200-fetch-user.js
module.exports = async (ctx, req, res) => {
  ctx.user = await db.users.findById(ctx.userId)

  if (!ctx.user) {
    return res.status(404).json({ error: '사용자를 찾을 수 없습니다' })
  }
}
```

### 패턴 3: 트랜잭션 처리

```javascript
// features/transfer/@post/steps/100-start-transaction.js
module.exports = async (ctx, req, res) => {
  ctx.transaction = await db.transaction()
}

// features/transfer/@post/steps/200-deduct-from-sender.js
module.exports = async (ctx, req, res) => {
  await db.accounts.update(
    { balance: db.raw('balance - ?', [ctx.amount]) },
    { where: { id: ctx.senderId }, transaction: ctx.transaction }
  )
}

// features/transfer/@post/steps/300-add-to-receiver.js
module.exports = async (ctx, req, res) => {
  await db.accounts.update(
    { balance: db.raw('balance + ?', [ctx.amount]) },
    { where: { id: ctx.receiverId }, transaction: ctx.transaction }
  )
}

// features/transfer/@post/steps/400-commit.js
module.exports = async (ctx, req, res) => {
  await ctx.transaction.commit()
  res.json({ success: true })
}

// features/transfer/@post/index.js
module.exports = feature({
  onError: async (error, ctx, req, res) => {
    if (ctx.transaction) {
      await ctx.transaction.rollback()
    }
    res.status(500).json({ error: error.message })
  }
})
```

---

## 마이그레이션 가이드

### Express 라우트에서 마이그레이션

**이전 (Express):**

```javascript
// routes/orders.js
const express = require('express')
const router = express.Router()
const orderController = require('../controllers/orderController')

router.post('/', orderController.createOrder)

module.exports = router

// controllers/orderController.js
exports.createOrder = async (req, res) => {
  // 1. 유효성 검증
  if (!req.body.productId) {
    return res.status(400).json({ error: '상품 ID가 필요합니다' })
  }

  // 2. 재고 확인
  const product = await db.products.findById(req.body.productId)
  if (product.stock < 1) {
    return res.status(400).json({ error: '재고 부족' })
  }

  // 3. 주문 생성
  const order = await db.orders.create({
    userId: req.user.id,
    productId: req.body.productId
  })

  // 4. 이메일 전송 (응답 차단!)
  await sendConfirmationEmail(order)

  res.status(201).json({ success: true, order })
}
```

**이후 (Feature-First):**

```
features/orders/@post/
├── steps/
│   ├── 100-validate.js
│   ├── 200-check-stock.js
│   ├── 300-create-order.js
│   └── 400-send-response.js
└── async-tasks/
    └── send-confirmation-email.js
```

```javascript
// steps/100-validate.js
module.exports = async (ctx, req, res) => {
  if (!req.body.productId) {
    return res.status(400).json({ error: '상품 ID가 필요합니다' })
  }
  ctx.productId = req.body.productId
}

// steps/200-check-stock.js
module.exports = async (ctx, req, res) => {
  const product = await db.products.findById(ctx.productId)
  if (product.stock < 1) {
    return res.status(400).json({ error: '재고 부족' })
  }
  ctx.product = product
}

// steps/300-create-order.js
module.exports = async (ctx, req, res) => {
  ctx.order = await db.orders.create({
    userId: req.user.id,
    productId: ctx.productId
  })
}

// steps/400-send-response.js
module.exports = async (ctx, req, res) => {
  res.status(201).json({ success: true, order: ctx.order })
}

// async-tasks/send-confirmation-email.js
module.exports = async (ctx) => {
  await sendConfirmationEmail(ctx.order)
}
```

**장점:**
- [Good] 각 Step을 독립적으로 테스트 가능
- [Good] 이메일 전송이 응답을 차단하지 않음
- [Good] Steps 추가/제거/재정렬이 쉬움
- [Good] 명확한 실행 흐름

---

## 요약

Feature-First 아키텍처는 다음에 관한 것입니다:

1. **기술적 레이어가 아닌 비즈니스 기능별로 구성**
2. **복잡한 로직을 순차적인 Steps로 분할**
3. **관련 코드를 함께 유지** (동작의 지역성)
4. **실행 순서를 명시적으로 만들기** (번호가 매겨진 Steps)
5. **백그라운드 작업에 async tasks 사용**

**결과:** 이해하고, 유지보수하고, 테스트하고, 확장하기 쉬운 코드.

---

**다음 단계:**
- [Convention over Configuration 가이드](./convention-over-configuration.ko.md)
- [express-numflow README](../README.ko.md)
- [Todo 앱 예제](../examples/todo-app/)
