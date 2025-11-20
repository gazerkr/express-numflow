# express-numflow

> Feature-First architecture plugin for Express - Bring [Numflow](https://github.com/gazerkr/numflow)'s Convention over Configuration to your Express apps

[![npm version](https://img.shields.io/npm/v/express-numflow.svg)](https://www.npmjs.com/package/express-numflow)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What is express-numflow?

**express-numflow** brings [Numflow](https://github.com/gazerkr/numflow)'s powerful **Feature-First architecture** to your existing Express applications. Split complex business logic into sequential steps, organize code by features, and let folder structure define your API - all without changing your Express setup.

### Key Features

- **Convention over Configuration** - Folder structure automatically defines HTTP methods and paths
- **Sequential Steps** - Break complex logic into numbered, auto-executing steps
- **Async Tasks** - Background tasks that don't block responses
- **Express Compatible** - Works with existing Express apps and middleware
- **Zero Config** - Optional `index.js` files, maximum automation
- **Type-Safe** - Full TypeScript support

---

## Installation

```bash
npm install express express-numflow
```

**Requirements:**
- Node.js >= 14.0.0
- Express ^4.0.0 || ^5.0.0

---

## Quick Start

```javascript
const express = require('express')
const { createFeatureRouter } = require('express-numflow')

const app = express()
app.use(express.json())

// Create Feature Router from folder structure
const featureRouter = await createFeatureRouter('./features')
app.use(featureRouter)

app.listen(3000)
```

---

## Convention over Configuration

### Folder Structure = API

```
features/
  api/
    users/
      @post/                 ← POST /api/users
        steps/
          100-validate.js
          200-create-user.js
        async-tasks/
          send-welcome-email.js
      [id]/
        @get/                ← GET /api/users/:id
          steps/
            100-fetch-user.js
```

### HTTP Methods

Use `@` prefix to define HTTP methods:

```
@get     → GET
@post    → POST
@put     → PUT
@patch   → PATCH
@delete  → DELETE
```

### Dynamic Routes

Use `[param]` folders for route parameters:

```
users/[id]/@get/     → GET /users/:id
posts/[postId]/comments/[commentId]/@get/
  → GET /posts/:postId/comments/:commentId
```

---

## Feature Structure

### Explicit Feature (`index.js` exists)

```javascript
// features/api/orders/@post/index.js
const { feature } = require('express-numflow')

module.exports = feature({
  // method, path, steps automatically inferred!

  contextInitializer: (ctx, req, res) => {
    ctx.orderData = req.body
  },

  onError: async (error, ctx, req, res) => {
    res.status(400).json({
      success: false,
      error: error.message,
    })
  },
})
```

### Implicit Feature (no `index.js` needed!)

```
features/
  greet/
    @get/
      steps/
        100-generate-greeting.js
        200-send-response.js
```

That's it! No configuration file needed.

---

## Steps (Sequential Execution)

Steps are executed **sequentially** in numeric order:

```javascript
// features/api/orders/@post/steps/100-validate.js
module.exports = async (ctx, req, res) => {
  if (!ctx.orderData.productId) {
    throw new Error('Product ID is required')
  }
  ctx.validated = true
}
```

```javascript
// features/api/orders/@post/steps/200-check-stock.js
module.exports = async (ctx, req, res) => {
  const inStock = await checkStock(ctx.orderData.productId)
  if (!inStock) {
    throw new Error('Product out of stock')
  }
  ctx.stockChecked = true
}
```

```javascript
// features/api/orders/@post/steps/300-create-order.js
module.exports = async (ctx, req, res) => {
  const orderId = await createOrder(ctx.orderData)

  res.status(201).json({
    success: true,
    orderId,
  })
}
```

**Flow**: 100 → 200 → 300 (automatic!)

### Why Numeric Flow?

The numeric prefix pattern (`100-`, `200-`, `300-`) is a deliberate design choice that brings **visibility to execution order**.

#### Philosophy: Make Implicit Behavior Explicit

In traditional codebases, execution order is often hidden in:
- Configuration files (hard to discover)
- Code comments (easily outdated)
- Mental models (hard to share)
- Runtime behavior (invisible until execution)

**Numflow makes execution order visible in the file system itself.**

#### Benefits

1. **Instant Understanding**
   ```
   steps/
     100-validate.js      ← Step 1: I run first
     200-check-stock.js   ← Step 2: I run second
     300-create-order.js  ← Step 3: I run third
   ```
   No need to read code or documentation - the order is **self-documenting**.

2. **Easy Reorganization**
   - Want to add a new step between validation and stock check?
   - Just create `150-check-user-limit.js`
   - No configuration files to update!

3. **Natural Sorting**
   - File explorers automatically sort by number
   - Same view for everyone on the team
   - No alphabetical confusion (`a-`, `b-`, `c-` is not scalable)

4. **Clear Dependencies**
   - Step 200 can safely use data from Step 100
   - Step 300 can safely use data from Steps 100 and 200
   - The flow is obvious from the numbers

5. **Better Onboarding**
   - New developers see the execution flow immediately
   - No need to trace through middleware chains
   - Lower cognitive load

#### Alternatives and Why We Didn't Choose Them

| Approach | Why Not? |
|----------|----------|
| **Alphabetical (`a-`, `b-`, `c-`)** | Hard to insert steps, runs out after 26 steps |
| **No prefixes** | Relies on directory order or config files (not explicit) |
| **Dates/Timestamps** | Meaningless to readers, hard to understand order |
| **Dependency graphs** | Complex, requires additional tooling to visualize |

#### The Result: Self-Documenting Code

When you open a Feature directory, you immediately see:
- What steps exist
- In what order they run
- Where to add new steps

**No README required. No documentation to maintain. The folder structure IS the documentation.**

This is the essence of Convention over Configuration - **let the structure speak for itself**.

---

## Response Methods

express-numflow supports all Express response methods, including **async methods** like `res.render()`, `res.download()`, and `res.sendFile()`:

```javascript
// features/blog/[slug]/@get/steps/100-render.js
module.exports = async (ctx, req, res) => {
  // res.render() works seamlessly - no await needed!
  res.render('blog-post', {
    title: ctx.post.title,
    content: ctx.post.content,
    author: ctx.post.author,
  })
}
```

```javascript
// features/files/download/@get/steps/100-download.js
module.exports = async (ctx, req, res) => {
  // res.download() also works automatically
  res.download('/path/to/file.pdf', 'document.pdf')
}
```

**How it works:**
- Synchronous methods (`res.json()`, `res.send()`, `res.end()`, `res.redirect()`) work instantly
- Async methods (`res.render()`, `res.download()`, `res.sendFile()`) are tracked automatically
- No `await`, no Promise wrapping, no callback handling needed
- express-numflow waits for async methods to complete before checking if response was sent

**Supported response methods:**
| Method | Type | Status |
|--------|------|--------|
| `res.send()` | Synchronous | ✅ Instant |
| `res.json()` | Synchronous | ✅ Instant |
| `res.redirect()` | Synchronous | ✅ Instant |
| `res.sendStatus()` | Synchronous | ✅ Instant |
| `res.end()` | Synchronous | ✅ Instant |
| `res.render()` | Async | ✅ Auto-tracked |
| `res.download()` | Async | ✅ Auto-tracked |
| `res.sendFile()` | Async | ✅ Auto-tracked |
| `res.sendfile()` | Async (deprecated) | ✅ Auto-tracked |

**This just works™** - write code naturally without thinking about async completion!

---

## Async Tasks (Background Execution)

Async tasks run in the **background** without blocking the response:

```javascript
// features/api/orders/@post/async-tasks/send-confirmation-email.js
module.exports = async (ctx) => {
  await sendEmail({
    to: ctx.orderData.email,
    subject: 'Order Confirmation',
    body: `Your order #${ctx.orderId} has been received!`,
  })
}
```

```javascript
// features/api/orders/@post/async-tasks/update-analytics.js
module.exports = async (ctx) => {
  await analytics.track('order_created', {
    orderId: ctx.orderId,
    productId: ctx.orderData.productId,
  })
}
```

**Response is sent immediately, tasks run in the background!**

---

## Integration with Existing Express Apps

### Co-exist with Express Routes

```javascript
const express = require('express')
const { createFeatureRouter } = require('express-numflow')

const app = express()

// Existing Express routes (unchanged)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/legacy', legacyRouter)

// Add Feature-First routes
const featureRouter = await createFeatureRouter('./features')
app.use(featureRouter)

app.listen(3000)
```

### Mount to Different Paths

```javascript
// API v2 with Feature-First
const apiV2Router = await createFeatureRouter('./features/api-v2')
app.use('/api/v2', apiV2Router)

// Admin panel
const adminRouter = await createFeatureRouter('./features/admin')
app.use('/admin', adminRouter)
```

---

## API Reference

### `createFeatureRouter(featuresDir, options?)`

Creates an Express Router from Features directory.

**Parameters:**

- `featuresDir` (string): Path to features directory
- `options` (object, optional):
  - `indexPatterns` (string[]): Index file patterns (default: `['index.js', 'index.ts', 'index.mjs', 'index.mts']`)
  - `excludeDirs` (string[]): Directories to exclude (default: `['node_modules', '.git', 'dist', 'build']`)
  - `debug` (boolean): Enable debug logging (default: `false`)
  - `routerOptions` (object): Express Router options

**Returns:** `Promise<Router>`

**Example:**

```javascript
const router = await createFeatureRouter('./features', {
  debug: true,
  excludeDirs: ['node_modules', 'test'],
})

app.use(router)
```

---

## Examples

See the `/examples` directory for complete examples:

- **[Todo App](./examples/todo-app/)** - Full-featured todo application demonstrating:
  - Feature-First architecture
  - CRUD operations with steps
  - Error handling
  - Integration tests

---

## Why express-numflow?

| Before (Express) | After (express-numflow) |
|------------------|-------------------------|
| Manual route registration | Folder structure = API |
| Complex route handlers | Sequential Steps |
| Scattered business logic | Organized by Feature |
| Background jobs = extra setup | Built-in Async Tasks |
| Lots of boilerplate | Convention over Config |

---

## Migration Path

1. **Start Small**: Add Feature-First to new endpoints only
2. **Co-exist**: Keep existing Express routes untouched
3. **Gradual Refactor**: Migrate complex routes to Features over time
4. **Full Adoption**: Eventually migrate to [Numflow](https://github.com/gazerkr/numflow) for 3.3x faster routing

---

## Comparison with Numflow

Wondering which one to choose? Here's a comparison:

| Feature | express-numflow | [Numflow](https://github.com/gazerkr/numflow) |
|---------|----------------|---------|
| Feature-First | Yes | Yes |
| Convention over Config | Yes | Yes |
| Express Compatible | Yes | Yes |
| High-Performance Routing | No (uses Express router) | Yes (Radix Tree, 3.3x faster) |
| Drop-in Replacement | Yes | Limited (requires migration) |
| Use Case | Gradual adoption | New projects, full migration |

**Recommendation**: Start with `express-numflow`, migrate to [Numflow](https://github.com/gazerkr/numflow) when you need performance.

---

## Performance

### Benchmark Results (Express 5.x)

Performance comparison between Pure Express and express-numflow using [autocannon](https://github.com/mcollina/autocannon):

**Test Environment:**
- Tool: autocannon
- Connections: 100 concurrent
- Duration: 10 seconds per scenario
- Warmup: 3 seconds

#### Results Summary

| Scenario | Pure Express | express-numflow | Difference |
|----------|--------------|-----------------|------------|
| **Simple GET** | 233,074 req/10s | 220,123 req/10s | -5.56% |
| | 4.33ms avg latency | 4.19ms avg latency | -3.23% (better) |
| **POST + Validation** | 204,358 req/10s | 200,006 req/10s | -2.13% |
| | 4.93ms avg latency | 4.41ms avg latency | -10.55% (better) |
| **Complex Multi-Step** | 203,102 req/10s | 190,728 req/10s | -6.09% |
| | 5.01ms avg latency | 5.38ms avg latency | +7.39% |

#### Key Findings

- **Throughput**: 2-6% lower than pure Express due to Feature system overhead
- **Latency**: Comparable or better in simple scenarios, slight increase in complex multi-step operations
- **Trade-off**: Small performance cost for significantly better code organization and maintainability

**Run benchmarks yourself:**

```bash
npm run benchmark
```

> **Note**: The performance overhead is minimal and acceptable for most applications. The benefits of Feature-First architecture (better organization, maintainability, and developer productivity) typically outweigh the small performance cost.

---

## Testing

express-numflow is thoroughly tested to ensure reliability and stability.

### Test Results

```bash
Test Suites: 9 passed, 9 total
Tests:       200 passed, 200 total
Coverage:    73.74% statements, 62.09% branches, 76.06% functions, 73.57% lines
```

### Test Coverage by Module

| Module | Coverage | Status |
|--------|----------|--------|
| `retry.ts` | 100% | Excellent |
| `type-guards.ts` | 100% | Excellent |
| `errors/index.ts` | 100% | Excellent |
| `auto-error-handler.ts` | 90.9% | Excellent |
| `feature-scanner.ts` | 89.18% | Good |
| `convention.ts` | 86.84% | Good |
| `create-feature-router.ts` | 83.33% | Good |
| `async-task-scheduler.ts` | 72.22% | Acceptable |

### Run Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- convention.test.ts
```

**Test Suite Includes:**
- Convention system tests (folder structure to API mapping)
- Feature execution tests (steps, context, error handling)
- Retry mechanism tests
- HTTP error classes tests
- Type guards tests
- Auto error handler tests
- Async task scheduler tests
- Integration tests with Express
- Edge case tests

---

## Learn More

- [API Reference](./docs/api-reference.md) - Complete API documentation
- [Feature-First Architecture Guide](./docs/feature-first-architecture.md)
- [Convention over Configuration](./docs/convention-over-configuration.md)
- [Path Aliasing Guide](./docs/path-aliasing.md)
- [Todo App Example](./examples/todo-app/)

---

## Path Aliasing

Deep folder nesting can lead to long relative paths. Use **path aliasing** to keep imports clean:

### Before (Long Relative Paths)

```javascript
// features/api/v2/users/[id]/posts/@get/steps/100-fetch.js
const db = require('../../../../../../../db')  // Bad
```

### After (Clean Aliases)

```javascript
// features/api/v2/users/[id]/posts/@get/steps/100-fetch.js
const db = require('#db')  // Good
```

### Quick Setup (Node.js >= 14.6)

Add to `package.json`:

```json
{
  "imports": {
    "#db": "./db.js",
    "#lib/*": "./lib/*.js",
    "#utils/*": "./utils/*.js"
  }
}
```

Then use in your code:

```javascript
const db = require('#db')
const { sendEmail } = require('#lib/email')
const { validateEmail } = require('#lib/validators')
```

**Other Solutions:**
- **module-alias** - For older Node.js versions
- **TypeScript paths** - For TypeScript projects

See the [Path Aliasing Guide](./docs/path-aliasing.md) for detailed strategies and best practices.

---

## Troubleshooting

### Features not loading?

Check the debug output:

```javascript
const router = await createFeatureRouter('./features', { debug: true })
```

### TypeScript errors?

Make sure you have type definitions installed:

```bash
npm install --save-dev @types/express
```

---

## License

MIT © [Numflow Team](https://github.com/gazerkr/numflow)

---

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

---

## Star Us!

If you find express-numflow useful, please give us a star on GitHub!

---

**Made by the [Numflow Team](https://github.com/gazerkr/numflow)**
