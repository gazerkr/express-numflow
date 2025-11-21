# express-numflow Basic ESM Example

> [한국어 문서](./README.ko.md)

This example demonstrates how to use express-numflow with **ES Modules (ESM)**.

## Features

- ✅ ES Modules (`import`/`export`)
- ✅ Short path setup with `package.json` imports
- ✅ Run directly with Node.js (no transpilation needed)
- ✅ Feature-First architecture
- ✅ Sequential Steps pattern
- ✅ Async Tasks (background jobs)

## Installation & Run

```bash
# Install dependencies
npm install

# Start server
npm start

# Or development mode (nodemon)
npm run dev
```

## Short Path Setup (package.json imports)

Setup in `package.json`:

```json
{
  "type": "module",
  "imports": {
    "#db": "./db.js",
    "#lib/*": "./lib/*.js"
  }
}
```

Usage example:

```javascript
// ❌ Before (Long relative paths)
import { getAllPosts } from '../../../db.js'
import { validatePost } from '../../../lib/validators.js'

// ✅ After (Short paths)
import { getAllPosts } from '#db'
import { validatePost } from '#lib/validators'
```

**Notes**:
- `"type": "module"` is required
- Short paths start with `#` (Node.js >= 14.6 recommended)
- File extension `.js` can be omitted

## Folder Structure

```
basic-esm/
├── package.json          # "type": "module" + imports
├── app.js                # Express server
├── db.js                 # Simple in-memory DB (#db)
├── lib/
│   └── validators.js     # Utilities (#lib/validators)
└── features/
    ├── health/
    │   └── @get/         # GET /health
    │       └── steps/
    │           └── 100-check.js
    └── posts/
        ├── @get/         # GET /posts
        │   ├── steps/
        │   │   ├── 100-fetch-posts.js
        │   │   └── 200-respond.js
        │   └── async-tasks/
        │       └── log-analytics.js
        ├── @post/        # POST /posts
        │   ├── steps/
        │   │   ├── 100-validate.js
        │   │   ├── 200-create-post.js
        │   │   └── 300-respond.js
        │   └── async-tasks/
        │       ├── send-notification.js
        │       ├── update-analytics.js
        │       └── index-for-search.js
        └── [id]/
            └── @get/     # GET /posts/:id
                ├── steps/
                │   ├── 100-fetch-post.js
                │   └── 200-respond.js
                └── async-tasks/
                    ├── increment-view-count.js
                    └── log-access.js
```

## API Endpoints

### GET /health
Health check

```bash
curl http://localhost:3000/health
```

### GET /posts
Get all posts

```bash
curl http://localhost:3000/posts
```

### POST /posts
Create a new post

```bash
curl -X POST http://localhost:3000/posts \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First Post",
    "content": "This is my first post content!",
    "author": "John Doe"
  }'
```

### GET /posts/:id
Get a specific post

```bash
curl http://localhost:3000/posts/1
```

## CJS vs ESM Differences

### Import/Export Syntax

**CJS:**
```javascript
const db = require('@db')
module.exports = async (ctx, req, res) => { ... }
```

**ESM:**
```javascript
import { getAllPosts } from '#db'
export default async (ctx, req, res) => { ... }
```

### Short Path Setup

**CJS (module-alias):**
```json
{
  "_moduleAliases": {
    "@db": "./db.js"
  }
}
```

**ESM (package.json imports):**
```json
{
  "type": "module",
  "imports": {
    "#db": "./db.js"
  }
}
```

### Execution

**CJS:**
- Requires `require('module-alias/register')`
- Run directly with Node.js

**ESM:**
- Requires `"type": "module"`
- Run directly with Node.js

## Core Concepts

### 1. Convention over Configuration

Folder structure defines the API:
- `@get` → GET method
- `@post` → POST method
- `[id]` → `:id` dynamic route

### 2. Sequential Steps

Steps execute automatically in numeric order:
```
100-validate.js   → Step 1
200-create.js     → Step 2
300-respond.js    → Step 3
```

### 3. Context Sharing

All steps share data through the `ctx` object:

```javascript
// Step 1: Store data
ctx.postData = req.body

// Step 2: Use data
const post = createPost(ctx.postData)
```

### 4. Early Return

Sending a response stops execution of subsequent steps:

```javascript
if (!validation.valid) {
  // Error response stops Step 2, 3 from executing
  return res.status(400).json({ errors: validation.errors })
}
```

### 5. Async Tasks (Background Jobs)

Tasks that run **after the response is sent** in the background:

```javascript
// features/posts/@post/async-tasks/send-notification.js
export default async (ctx) => {
  // Response already sent - user doesn't wait
  await sendEmail({
    to: 'subscribers@example.com',
    subject: `New Post: ${ctx.post.title}`,
  })
  console.log('[ASYNC-TASK] 📧 Notification sent')
}
```

**Execution Flow:**
```
1. Step 100: Validation
2. Step 200: Create post
3. Step 300: Send response ← User receives response here
4. Async Task 1: Send notification (background)
5. Async Task 2: Update analytics (background)
6. Async Task 3: Index for search (background)
```

**Included Async Tasks:**

| Endpoint | Async Tasks | Purpose |
|----------|-------------|---------|
| GET /posts | `log-analytics.js` | Log view analytics |
| POST /posts | `send-notification.js` | Send subscriber notification |
| | `update-analytics.js` | Update analytics dashboard |
| | `index-for-search.js` | Index for search engine |
| GET /posts/:id | `increment-view-count.js` | Increment view count |
| | `log-access.js` | Log access for audit |

**Benefits:**
- ✅ Faster response time (user doesn't wait)
- ✅ Handle slow operations like email, push notifications
- ✅ Separate analytics and logging from main logic
- ✅ Clear separation between main and auxiliary logic

**Test:**
```bash
# After starting server
curl -X POST http://localhost:3000/posts \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","content":"Test content","author":"John"}'

# Check async-tasks logs in console:
# [ASYNC-TASK] 📧 Notification sent to subscribers
# [ASYNC-TASK] 📊 Analytics updated: New post created
# [ASYNC-TASK] 🔍 Search index updated
```

## Other Examples

- [CJS Example](../basic-cjs/) - CommonJS (`require`/`module.exports`)
- [TypeScript Example](../basic-ts/) - TypeScript with types
