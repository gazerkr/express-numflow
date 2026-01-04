# Feature-First Architecture Guide

## Table of Contents

- [What is Feature-First Architecture?](#what-is-feature-first-architecture)
- [Why Feature-First?](#why-feature-first)
- [Core Concepts](#core-concepts)
- [Structure and Patterns](#structure-and-patterns)
- [Real-World Examples](#real-world-examples)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)
- [Migration Guide](#migration-guide)

---

## What is Feature-First Architecture?

**Feature-First Architecture** is an organizational pattern that structures code **by business features** instead of technical layers. Each feature is a self-contained unit that includes all the logic, steps, and tasks needed to handle a specific business capability.

### Traditional Layer-Based Approach

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

**Problem**: To understand or modify a single feature (e.g., "Create Order"), you need to jump between 4+ different directories.

### Feature-First Approach

```
features/
├── users/
│   ├── @post/              # Create user
│   ├── [id]/@get/          # Get user
│   └── [id]/@put/          # Update user
├── orders/
│   ├── @post/              # Create order
│   │   ├── steps/
│   │   │   ├── 100-validate.js
│   │   │   ├── 200-check-stock.js
│   │   │   └── 300-create-order.js
│   │   └── async-tasks/
│   │       └── send-confirmation-email.js
│   ├── @get/               # List orders
│   └── [id]/@get/          # Get order
└── products/
    ├── @get/               # List products
    └── [id]/@get/          # Get product
```

**Benefit**: Everything related to "Create Order" is in one place: `features/orders/@post/`

---

## Why Feature-First?

### 1. **Locality of Behavior**

Related code lives together. To understand or modify a feature, you only need to look in one directory.

```
orders/@post/
├── steps/
│   ├── 100-validate.js          ← Validation logic
│   ├── 200-check-stock.js       ← Business logic
│   ├── 300-reserve-inventory.js ← Transaction logic
│   └── 400-create-order.js      ← Database logic
└── async-tasks/
    ├── send-confirmation-email.js ← Background task
    └── update-analytics.js         ← Background task
```

### 2. **Easier Reasoning**

You can understand a feature's complete behavior without jumping between files:
- **What does this feature do?** Read the steps in order
- **What happens after the response?** Check async-tasks
- **How do I add validation?** Add a step file

### 3. **Better Team Collaboration**

Different developers can work on different features without conflicts:
- Developer A works on `orders/@post/`
- Developer B works on `products/@get/`
- Zero merge conflicts in most cases

### 4. **Scalability**

As your application grows:
- **Layer-based**: Files grow larger, directories become overwhelming
- **Feature-First**: New features are new directories, existing features stay isolated

### 5. **Easier Testing**

Each feature is independently testable:
```javascript
// Test the entire "Create Order" feature
const createOrderFeature = require('./features/orders/@post')
```

---

## Core Concepts

### 1. Feature

A **Feature** is a self-contained unit that handles one HTTP endpoint.

**Structure:**
```
feature-name/
├── @method/              # HTTP method (required)
│   ├── index.js          # Feature configuration (optional)
│   ├── steps/            # Sequential execution steps
│   │   ├── 100-xxx.js
│   │   ├── 200-xxx.js
│   │   └── 300-xxx.js
│   └── async-tasks/      # Background tasks (optional)
│       ├── task1.js
│       └── task2.js
```

### 2. Steps

**Steps** are functions that execute **sequentially** to handle a request.

**Characteristics:**
- Execute in numeric order (100 → 200 → 300)
- Share a common `ctx` (context) object
- Can access `req` and `res`
- Can throw errors to stop execution

**Example:**
```javascript
// steps/100-validate.js
module.exports = async (ctx, req, res) => {
  if (!req.body.email) {
    throw new Error('Email is required')
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

The **context** object is shared between all steps:
- Initialized fresh for each request
- Used to pass data between steps
- Mutable (steps can modify it)

**Best Practice:**
```javascript
// [Good]: Use ctx to pass data
ctx.userId = user.id
ctx.orderData = { ... }

// [Bad]: Use global variables or module-level state
global.userId = user.id  // Don't do this!
```

### 4. Async Tasks

**Async Tasks** run in the background after the response is sent:
- Do not block the HTTP response
- Perfect for emails, logging, analytics, etc.
- Have access to `ctx` (but not `req` or `res`)

**Example:**
```javascript
// async-tasks/send-welcome-email.js
module.exports = async (ctx) => {
  await sendEmail({
    to: ctx.user.email,
    subject: 'Welcome!',
    body: `Hi ${ctx.user.name}!`
  })
}
```

---

## Structure and Patterns

### HTTP Methods

Use `@` prefix to define HTTP methods:

```
@get/     → GET
@post/    → POST
@put/     → PUT
@patch/   → PATCH
@delete/  → DELETE
```

**Example:**
```
users/
├── @get/      → GET /users (list all)
├── @post/     → POST /users (create)
└── [id]/
    ├── @get/     → GET /users/:id
    ├── @put/     → PUT /users/:id
    └── @delete/  → DELETE /users/:id
```

### Dynamic Routes

Use `[param]` folders for route parameters:

```
posts/[postId]/comments/[commentId]/@get/
→ GET /posts/:postId/comments/:commentId
```

**Access parameters in steps:**
```javascript
module.exports = async (ctx, req, res) => {
  const { postId, commentId } = req.params
  // Use them...
}
```

### Nested Features

Group related features together:

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

**Mounting:**
```javascript
const apiV1Router = await createFeatureRouter('./features/api/v1')
app.use('/api/v1', apiV1Router)

const apiV2Router = await createFeatureRouter('./features/api/v2')
app.use('/api/v2', apiV2Router)
```

---

## Real-World Examples

### Example 1: User Registration

**Feature:** `users/@post/`

**Structure:**
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
    return res.status(400).json({ error: 'Invalid email' })
  }

  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Password must be 8+ characters' })
  }

  ctx.email = email
  ctx.password = password
}

// 200-check-existing-user.js
module.exports = async (ctx, req, res) => {
  const existing = await db.users.findByEmail(ctx.email)

  if (existing) {
    return res.status(409).json({ error: 'Email already registered' })
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
    message: `New user registered: ${ctx.email}`
  })
}
```

### Example 2: File Upload

**Feature:** `uploads/@post/`

**Structure:**
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
    return res.status(400).json({ error: 'No file uploaded' })
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
  if (!allowedTypes.includes(file.mimetype)) {
    return res.status(400).json({ error: 'Invalid file type' })
  }

  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    return res.status(400).json({ error: 'File too large' })
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

## Best Practices

### 1. Keep Steps Small and Focused

Each step should do **one thing**:

```javascript
// [Good]: Single responsibility
// 100-validate-email.js
module.exports = async (ctx, req, res) => {
  if (!req.body.email || !req.body.email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email' })
  }
  ctx.email = req.body.email
}

// [Bad]: Multiple responsibilities
// 100-validate-and-create-user.js
module.exports = async (ctx, req, res) => {
  // Validation
  if (!req.body.email) { ... }

  // Hashing
  const hashed = await bcrypt.hash(req.body.password, 10)

  // Database
  const user = await db.create({ ... })

  // Response
  res.json({ ... })
}
```

### 2. Use Descriptive Step Names

File names should describe what the step does:

```javascript
// [Good]
100-validate-order-data.js
200-check-inventory-availability.js
300-calculate-total-price.js
400-apply-discount-code.js
500-create-order-in-database.js

// [Bad]
100-validate.js
200-check.js
300-calculate.js
400-apply.js
500-create.js
```

### 3. Number Steps with Gaps

Leave room for future steps:

```javascript
// [Good]: Easy to insert new steps
100-validate.js
200-check-stock.js
300-create-order.js

// Want to add a step between 100 and 200?
100-validate.js
150-check-user-limit.js  ← Easy!
200-check-stock.js
300-create-order.js

// [Bad]: Hard to insert
1-validate.js
2-check-stock.js
3-create-order.js
// Now what? 1.5-xxx.js?
```

### 4. Early Returns for Validation

Return early if validation fails:

```javascript
module.exports = async (ctx, req, res) => {
  if (!req.body.email) {
    return res.status(400).json({ error: 'Email required' })
  }

  if (!req.body.password) {
    return res.status(400).json({ error: 'Password required' })
  }

  // Continue with valid data
  ctx.email = req.body.email
  ctx.password = req.body.password
}
```

### 5. Use Context for Data Flow

Always use `ctx` to pass data between steps:

```javascript
// Step 1
module.exports = async (ctx, req, res) => {
  ctx.userId = req.user.id
  ctx.productId = req.body.productId
}

// Step 2 (uses data from Step 1)
module.exports = async (ctx, req, res) => {
  const product = await db.products.findById(ctx.productId)
  ctx.product = product
}

// Step 3 (uses data from Step 1 and 2)
module.exports = async (ctx, req, res) => {
  const order = await db.orders.create({
    userId: ctx.userId,
    productId: ctx.product.id,
    price: ctx.product.price
  })
  ctx.order = order
}
```

### 6. One Response Per Feature

Send the response in the **last step**, not in async tasks:

```javascript
// [Good]: Last step sends response
// steps/300-send-response.js
module.exports = async (ctx, req, res) => {
  res.json({ success: true, data: ctx.result })
}

// [Bad]: Don't send responses in async tasks
// async-tasks/some-task.js
module.exports = async (ctx) => {
  // Don't do this - res is not available!
  // res.json({ ... })
}
```

### 7. Handle Errors Gracefully

Use try-catch or error handlers:

```javascript
// Option 1: Try-catch in steps
module.exports = async (ctx, req, res) => {
  try {
    ctx.user = await db.users.findById(req.params.id)
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to fetch user',
      details: error.message
    })
  }
}

// Option 2: Custom error handler in index.js
module.exports = feature({
  onError: async (error, ctx, req, res) => {
    console.error('Feature error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})
```

---

## Common Patterns

### Pattern 1: Pagination

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

### Pattern 2: Authentication Middleware

```javascript
// features/protected/@get/steps/100-authenticate.js
const jwt = require('jsonwebtoken')

module.exports = async (ctx, req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({ error: 'No token provided' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    ctx.userId = decoded.userId
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

// features/protected/@get/steps/200-fetch-user.js
module.exports = async (ctx, req, res) => {
  ctx.user = await db.users.findById(ctx.userId)

  if (!ctx.user) {
    return res.status(404).json({ error: 'User not found' })
  }
}
```

### Pattern 3: Transaction Handling

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

## Migration Guide

### Migrating from Express Routes

**Before (Express):**

```javascript
// routes/orders.js
const express = require('express')
const router = express.Router()
const orderController = require('../controllers/orderController')

router.post('/', orderController.createOrder)

module.exports = router

// controllers/orderController.js
exports.createOrder = async (req, res) => {
  // 1. Validate
  if (!req.body.productId) {
    return res.status(400).json({ error: 'Product ID required' })
  }

  // 2. Check stock
  const product = await db.products.findById(req.body.productId)
  if (product.stock < 1) {
    return res.status(400).json({ error: 'Out of stock' })
  }

  // 3. Create order
  const order = await db.orders.create({
    userId: req.user.id,
    productId: req.body.productId
  })

  // 4. Send email (blocks response!)
  await sendConfirmationEmail(order)

  res.status(201).json({ success: true, order })
}
```

**After (Feature-First):**

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
    return res.status(400).json({ error: 'Product ID required' })
  }
  ctx.productId = req.body.productId
}

// steps/200-check-stock.js
module.exports = async (ctx, req, res) => {
  const product = await db.products.findById(ctx.productId)
  if (product.stock < 1) {
    return res.status(400).json({ error: 'Out of stock' })
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

**Benefits:**
- [Good] Each step is independently testable
- [Good] Email sending doesn't block the response
- [Good] Easy to add/remove/reorder steps
- [Good] Clear execution flow

---

## Summary

Feature-First Architecture is about:

1. **Organizing by business features**, not technical layers
2. **Breaking complex logic into sequential steps**
3. **Keeping related code together** (locality of behavior)
4. **Making execution order explicit** (numbered steps)
5. **Using async tasks for background work**

**Result:** Code that is easier to understand, maintain, test, and scale.

---

**Next Steps:**
- [Convention over Configuration Guide](./convention-over-configuration.md)
- [express-numflow README](../README.md)
- [Todo App Example](../examples/todo-app/)
