# express-numflow Basic TypeScript Example

> [한국어 문서](./README.ko.md)

This example demonstrates how to use express-numflow with **TypeScript**.

## Features

- ✅ Full TypeScript support with type safety
- ✅ Short path setup with `tsconfig.json` paths
- ✅ Run directly with `tsx` (fast and simple)
- ✅ Feature-First architecture
- ✅ Sequential Steps pattern
- ✅ Async Tasks (background jobs)
- ✅ Type-safe Context sharing

## Installation & Run

```bash
# Install dependencies
npm install

# Development mode (tsx watch - auto restart)
npm run dev

# Or direct execution
npm start

# Build (optional)
npm run build
npm run serve
```

## Short Path Setup (tsconfig.json paths)

Setup in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@db": ["./db.ts"],
      "@lib/*": ["./lib/*"]
    }
  }
}
```

Usage example:

```typescript
// ❌ Before (Long relative paths)
import { getAllPosts } from '../../../db'
import { validatePost } from '../../../lib/validators'

// ✅ After (Short paths)
import { getAllPosts } from '@db'
import { validatePost } from '@lib/validators'
```

**Notes**:
- tsx auto-resolves paths (no additional setup needed)
- For production build, [tsconfig-paths](https://www.npmjs.com/package/tsconfig-paths) may be needed

## Folder Structure

```
basic-ts/
├── package.json
├── tsconfig.json         # baseUrl + paths
├── app.ts                # Express server
├── db.ts                 # Simple in-memory DB (@db)
├── lib/
│   └── validators.ts     # Utilities (@lib/validators)
└── features/
    ├── health/
    │   └── @get/         # GET /health
    │       └── steps/
    │           └── 100-check.ts
    └── posts/
        ├── @get/         # GET /posts
        │   ├── steps/
        │   │   ├── 100-fetch-posts.ts
        │   │   └── 200-respond.ts
        │   └── async-tasks/
        │       └── log-analytics.ts
        ├── @post/        # POST /posts
        │   ├── steps/
        │   │   ├── 100-validate.ts
        │   │   ├── 200-create-post.ts
        │   │   └── 300-respond.ts
        │   └── async-tasks/
        │       ├── send-notification.ts
        │       ├── update-analytics.ts
        │       └── index-for-search.ts
        └── [id]/
            └── @get/     # GET /posts/:id
                ├── steps/
                │   ├── 100-fetch-post.ts
                │   └── 200-respond.ts
                └── async-tasks/
                    ├── increment-view-count.ts
                    └── log-access.ts
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

## TypeScript Features

### 1. Type-Safe Context

Define Context types for each step:

```typescript
interface Context {
  postData: CreatePostData
  post?: Post
  validated?: boolean
}

export default async (ctx: Context, req: Request, res: Response) => {
  // ctx.postData is type-safe!
  ctx.post = createPost(ctx.postData)
}
```

### 2. Type-Safe Database

All database functions are type-safe:

```typescript
export interface Post {
  id: string
  title: string
  content: string
  author: string
  createdAt: Date
}

export function createPost(data: CreatePostData): Post {
  // Return type is guaranteed
}
```

### 3. Type-Safe Validation

Validation results are also typed:

```typescript
export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export function validatePost(data: any): ValidationResult {
  // ...
}
```

### 4. IDE Auto-completion

TypeScript provides perfect auto-completion and type checking in your IDE.

## CJS vs ESM vs TypeScript Comparison

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

**TypeScript:**
```typescript
import { getAllPosts, Post } from '@db'
export default async (ctx: Context, req: Request, res: Response) => { ... }
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

**TypeScript (tsconfig.json paths):**
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@db": ["./db.ts"]
    }
  }
}
```

### Execution

**CJS:**
- `require('module-alias/register')` required
- `node app.js`

**ESM:**
- `"type": "module"` required
- `node app.js`

**TypeScript:**
- `tsx app.ts` (development)
- `tsc && node dist/app.js` (production)

## Core Concepts

### 1. Convention over Configuration

Folder structure defines the API:
- `@get` → GET method
- `@post` → POST method
- `[id]` → `:id` dynamic route

### 2. Sequential Steps

Steps execute automatically in numeric order:
```
100-validate.ts   → Step 1
200-create.ts     → Step 2
300-respond.ts    → Step 3
```

### 3. Type-Safe Context Sharing

All steps share data through the type-safe `ctx` object:

```typescript
// Step 1: Store data (type-checked)
ctx.postData = req.body

// Step 2: Use data (auto-completion supported)
const post = createPost(ctx.postData)
```

### 4. Early Return

Sending a response stops execution of subsequent steps:

```typescript
if (!validation.valid) {
  // Error response stops Step 2, 3 from executing
  return res.status(400).json({ errors: validation.errors })
}
```

### 5. Async Tasks (Background Jobs)

Tasks that run **after the response is sent** in the background:

```typescript
// features/posts/@post/async-tasks/send-notification.ts
import { Post } from '@db'

interface Context {
  post: Post
}

export default async (ctx: Context) => {
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
| GET /posts | `log-analytics.ts` | Log view analytics |
| POST /posts | `send-notification.ts` | Send subscriber notification |
| | `update-analytics.ts` | Update analytics dashboard |
| | `index-for-search.ts` | Index for search engine |
| GET /posts/:id | `increment-view-count.ts` | Increment view count |
| | `log-access.ts` | Log access for audit |

**TypeScript Benefits:**
- ✅ Async Task Context is also type-safe!
- ✅ IDE auto-completion for `ctx.post.title`
- ✅ Compile-time error detection

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
- [ESM Example](../basic-esm/) - ES Modules (`import`/`export`)
