# Convention over Configuration Guide

## Table of Contents

- [What is Convention over Configuration?](#what-is-convention-over-configuration)
- [Why Convention over Configuration?](#why-convention-over-configuration)
- [Conventions in express-numflow](#conventions-in-express-numflow)
- [Folder Structure Conventions](#folder-structure-conventions)
- [HTTP Method Conventions](#http-method-conventions)
- [File Naming Conventions](#file-naming-conventions)
- [Real-World Examples](#real-world-examples)
- [Convention vs Configuration](#convention-vs-configuration)
- [Best Practices](#best-practices)

---

## What is Convention over Configuration?

**Convention over Configuration** (CoC) is a software design paradigm that **reduces the number of decisions developers need to make** by providing sensible defaults based on conventions.

Instead of writing configuration files to tell the framework what to do, you follow naming and structural patterns that the framework already understands.

### Traditional Approach (Configuration-Heavy)

```javascript
// config/routes.js
module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/users',
      handler: 'controllers/users.list',
      steps: ['validate', 'fetch', 'respond']
    },
    {
      method: 'POST',
      path: '/users',
      handler: 'controllers/users.create',
      steps: ['validate', 'create', 'respond'],
      asyncTasks: ['sendWelcomeEmail']
    }
  ]
}
```

**Problems:**
- Configuration files grow large
- Easy to make mistakes
- Configuration can become outdated
- Duplication between folder structure and config

### Convention over Configuration Approach

```
features/
└── users/
    ├── @get/              ← Convention: @get = GET /users
    │   └── steps/
    │       ├── 100-validate.js
    │       ├── 200-fetch.js
    │       └── 300-respond.js
    └── @post/             ← Convention: @post = POST /users
        ├── steps/
        │   ├── 100-validate.js
        │   ├── 200-create.js
        │   └── 300-respond.js
        └── async-tasks/
            └── sendWelcomeEmail.js
```

**Benefits:**
- **No configuration file needed**
- **Folder structure = configuration**
- **Self-documenting**
- **Impossible to have config/code mismatch**

---

## Why Convention over Configuration?

### 1. **Less Boilerplate**

You write **code**, not **configuration**.

**With Configuration:**
```javascript
// routes.config.js (20 lines)
// controllers/users.js (handler registration)
// app.js (route loading)
```

**With Convention:**
```
features/users/@post/steps/100-validate.js
(that's it!)
```

### 2. **Faster Development**

No need to:
- Create configuration files
- Register routes manually
- Update configs when adding features
- Debug config mismatches

### 3. **Better Discoverability**

New developers can explore the codebase by **just looking at folders**:

```
features/
├── users/          ← "Ah, user-related features"
│   ├── @get/       ← "GET endpoint"
│   └── @post/      ← "POST endpoint"
└── orders/
    ├── @get/
    └── @post/
```

No need to read documentation or config files!

### 4. **Consistency**

Everyone on the team follows the same structure:
- New feature? Create a folder with `@method/`
- Add validation? Create `100-validate.js`
- Add background task? Create `async-tasks/task.js`

**Zero ambiguity. Zero discussion needed.**

### 5. **Maintainability**

Conventions are **enforced by the file system**:
- Can't have a typo in the method (folder won't match)
- Can't forget to register a route (auto-discovered)
- Can't have orphaned config (folder = config)

---

## Conventions in express-numflow

express-numflow uses the following conventions:

### 1. **Folder Names → Routes**

```
features/api/users/  →  /api/users
features/posts/      →  /posts
```

### 2. **`@method` Folders → HTTP Methods**

```
@get/     →  GET
@post/    →  POST
@put/     →  PUT
@patch/   →  PATCH
@delete/  →  DELETE
```

### 3. **`[param]` Folders → Route Parameters**

```
users/[id]/       →  /users/:id
posts/[postId]/   →  /posts/:postId
```

### 4. **`steps/` Folder → Sequential Execution**

```
steps/
  100-validate.js   →  Executes first
  200-process.js    →  Executes second
  300-respond.js    →  Executes third
```

### 5. **`async-tasks/` Folder → Background Tasks**

```
async-tasks/
  send-email.js     →  Runs in background after response
  update-cache.js   →  Runs in background after response
```

### 6. **Numeric Prefixes → Execution Order**

```
100-xxx.js   →  Step 1
200-xxx.js   →  Step 2
300-xxx.js   →  Step 3
```

---

## Folder Structure Conventions

### Basic Structure

```
features/
└── [feature-name]/
    └── @[method]/
        ├── index.js         (optional - for explicit config)
        ├── steps/           (required - sequential logic)
        │   ├── 100-xxx.js
        │   ├── 200-xxx.js
        │   └── 300-xxx.js
        └── async-tasks/     (optional - background tasks)
            ├── task1.js
            └── task2.js
```

### Nested Features

```
features/
└── api/
    └── v1/
        └── users/
            ├── @get/
            └── @post/

→ Routes:
  GET  /api/v1/users
  POST /api/v1/users
```

### Dynamic Routes

```
features/
└── users/
    └── [id]/
        ├── @get/        →  GET /users/:id
        ├── @put/        →  PUT /users/:id
        └── @delete/     →  DELETE /users/:id
```

### Multi-Level Parameters

```
features/
└── posts/
    └── [postId]/
        └── comments/
            └── [commentId]/
                └── @get/

→ Route: GET /posts/:postId/comments/:commentId
```

---

## HTTP Method Conventions

### Standard Methods

| Folder Name | HTTP Method | Typical Use |
|-------------|-------------|-------------|
| `@get/` | GET | List or retrieve resources |
| `@post/` | POST | Create new resources |
| `@put/` | PUT | Update entire resource |
| `@patch/` | PATCH | Partially update resource |
| `@delete/` | DELETE | Delete resource |

### Convention Examples

**List all users:**
```
users/@get/  →  GET /users
```

**Create a user:**
```
users/@post/  →  POST /users
```

**Get specific user:**
```
users/[id]/@get/  →  GET /users/:id
```

**Update user:**
```
users/[id]/@put/  →  PUT /users/:id
```

**Delete user:**
```
users/[id]/@delete/  →  DELETE /users/:id
```

**Custom action (mark as complete):**
```
todos/[id]/complete/@patch/  →  PATCH /todos/:id/complete
```

---

## File Naming Conventions

### Step Files

**Convention:** `[number]-[descriptive-name].js`

**Rules:**
1. Start with a number (100, 200, 300, etc.)
2. Use hyphens for spaces
3. Use descriptive names

**Examples:**

```javascript
// Good
100-validate-input.js
200-check-permissions.js
300-fetch-from-database.js
400-transform-data.js
500-send-response.js

// Bad
1.js                    // Not descriptive
step1.js                // Missing number prefix
validateInput.js        // Missing number
validate_input.js       // Use hyphens, not underscores
```

### Async Task Files

**Convention:** `[descriptive-name].js` (no numbers needed)

**Rules:**
1. Use descriptive names
2. Use hyphens for spaces
3. No number prefix (tasks run in parallel)

**Examples:**

```javascript
// Good
send-welcome-email.js
update-user-analytics.js
notify-admin.js
generate-pdf-report.js

// Bad
email.js                // Not descriptive enough
sendWelcomeEmail.js     // Use hyphens, not camelCase
100-send-email.js       // Don't use numbers (they run in parallel)
```

### Index Files (Optional)

**Convention:** `index.js`

Use when you need explicit configuration:

```javascript
// features/users/@post/index.js
const { feature } = require('express-numflow')

module.exports = feature({
  contextInitializer: (ctx, req, res) => {
    ctx.timestamp = Date.now()
  },

  onError: async (error, ctx, req, res) => {
    res.status(500).json({ error: error.message })
  }
})
```

**Most features don't need `index.js` - it's optional!**

---

## Real-World Examples

### Example 1: RESTful Users API

**Folder Structure:**
```
features/
└── users/
    ├── @get/                   # GET /users - List all
    │   └── steps/
    │       ├── 100-fetch-users.js
    │       └── 200-send-response.js
    ├── @post/                  # POST /users - Create
    │   ├── steps/
    │   │   ├── 100-validate.js
    │   │   ├── 200-create-user.js
    │   │   └── 300-send-response.js
    │   └── async-tasks/
    │       └── send-welcome-email.js
    └── [id]/
        ├── @get/               # GET /users/:id - Get one
        │   └── steps/
        │       ├── 100-fetch-user.js
        │       └── 200-send-response.js
        ├── @put/               # PUT /users/:id - Update
        │   └── steps/
        │       ├── 100-validate.js
        │       ├── 200-update-user.js
        │       └── 300-send-response.js
        └── @delete/            # DELETE /users/:id - Delete
            └── steps/
                ├── 100-delete-user.js
                └── 200-send-response.js
```

**What You Get (Zero Configuration):**
- 5 API endpoints automatically registered
- Clear execution order for each endpoint
- Background email task for user creation
- Self-documenting structure

### Example 2: Blog API with Comments

**Folder Structure:**
```
features/
└── posts/
    ├── @get/                           # GET /posts
    ├── @post/                          # POST /posts
    └── [postId]/
        ├── @get/                       # GET /posts/:postId
        ├── @put/                       # PUT /posts/:postId
        ├── @delete/                    # DELETE /posts/:postId
        ├── publish/
        │   └── @patch/                 # PATCH /posts/:postId/publish
        └── comments/
            ├── @get/                   # GET /posts/:postId/comments
            ├── @post/                  # POST /posts/:postId/comments
            └── [commentId]/
                ├── @get/               # GET /posts/:postId/comments/:commentId
                ├── @put/               # PUT /posts/:postId/comments/:commentId
                └── @delete/            # DELETE /posts/:postId/comments/:commentId
```

**What You Get:**
- 11 API endpoints from folder structure alone
- Nested resource routes (posts → comments)
- Custom action route (publish)
- Multiple route parameters

### Example 3: File Upload Service

**Folder Structure:**
```
features/
└── uploads/
    ├── @post/                          # POST /uploads
    │   ├── steps/
    │   │   ├── 100-validate-file.js
    │   │   ├── 200-upload-to-s3.js
    │   │   ├── 300-create-record.js
    │   │   └── 400-send-response.js
    │   └── async-tasks/
    │       ├── generate-thumbnail.js
    │       ├── scan-for-virus.js
    │       └── update-search-index.js
    └── [id]/
        ├── @get/                       # GET /uploads/:id
        │   └── steps/
        │       ├── 100-fetch-upload.js
        │       ├── 200-generate-signed-url.js
        │       └── 300-send-response.js
        └── @delete/                    # DELETE /uploads/:id
            └── steps/
                ├── 100-delete-from-s3.js
                ├── 200-delete-record.js
                └── 300-send-response.js
```

**Conventions at Work:**
- `@post/` → POST method
- `steps/100-*` → Executes first
- `async-tasks/` → Runs after response (thumbnail generation doesn't block)
- `[id]/` → Route parameter

---

## Convention vs Configuration

### When to Use Convention

**Use conventions when:**
- The default behavior fits your needs
- You want minimal boilerplate
- You value consistency and discoverability
- You're building standard REST APIs

**Example:**
```
users/@post/steps/100-validate.js
(Just create the file - it works!)
```

### When to Use Configuration

**Use configuration when:**
- You need custom initialization
- You need custom error handling
- You need to override defaults

**Example:**
```javascript
// features/users/@post/index.js
module.exports = feature({
  contextInitializer: (ctx, req, res) => {
    // Custom initialization
    ctx.timestamp = Date.now()
    ctx.requestId = generateRequestId()
  },

  onError: async (error, ctx, req, res) => {
    // Custom error handling
    await logError(error, ctx.requestId)
    res.status(500).json({
      error: 'Internal Server Error',
      requestId: ctx.requestId
    })
  }
})
```

### Mixing Convention and Configuration

You can mix both:

```
users/@post/
├── index.js              ← Configuration (optional)
├── steps/                ← Convention
│   ├── 100-validate.js
│   └── 200-create.js
└── async-tasks/          ← Convention
    └── send-email.js
```

**Rule of thumb:**
- Start with convention (no `index.js`)
- Add configuration (`index.js`) only when needed

---

## Best Practices

### 1. **Follow the Conventions Strictly**

Consistency is key:

```
// Good: Consistent structure
features/users/@post/steps/100-validate.js
features/orders/@post/steps/100-validate.js
features/products/@post/steps/100-validate.js

// Bad: Inconsistent
features/users/@post/steps/100-validate.js
features/orders/create/steps/validate.js
features/products/createProduct/100-check.js
```

### 2. **Use Descriptive Names**

Make the purpose obvious:

```
// Good
100-validate-email-format.js
200-check-user-exists.js
300-hash-password.js

// Bad
100-validate.js
200-check.js
300-hash.js
```

### 3. **Don't Fight the Conventions**

If you find yourself needing lots of configuration, reconsider your structure:

```
// Bad: Fighting conventions
features/users/createUser/@post/
// Why not just: features/users/@post/

// Good: Following conventions
features/users/@post/
```

### 4. **Leverage Auto-Discovery**

Let the framework discover your features:

```javascript
// Good: Auto-discovery
const router = await createFeatureRouter('./features')
app.use(router)

// Bad: Manual registration
app.post('/users', userController.create)
app.get('/users', userController.list)
// ... (lots of manual routes)
```

### 5. **Document Deviations**

If you must deviate from conventions, document why:

```javascript
// features/special-case/@post/index.js

// NOTE: Using custom error handler because this feature
// needs to log errors to external service
module.exports = feature({
  onError: async (error, ctx, req, res) => {
    await externalLogger.log(error)
    res.status(500).json({ error: error.message })
  }
})
```

### 6. **Use Gaps in Step Numbers**

Leave room for future steps:

```
// Good: Easy to insert new steps
100-validate.js
200-process.js
300-respond.js

// Want to add something between 100 and 200?
100-validate.js
150-sanitize.js  (Easy!)
200-process.js

// Bad: Hard to insert
1-validate.js
2-process.js
3-respond.js
// Now what? 1.5-xxx.js?
```

### 7. **Group Related Features**

Use folders to group related features:

```
features/
├── auth/
│   ├── login/@post/
│   ├── logout/@post/
│   └── refresh/@post/
├── users/
│   ├── @get/
│   └── @post/
└── admin/
    ├── users/@get/
    └── stats/@get/
```

---

## Summary

**Convention over Configuration** means:

1. **Folder structure defines routes** - No route config files
2. **`@method/` defines HTTP methods** - No method registration
3. **`[param]/` defines parameters** - No route parameter config
4. **Numeric prefixes define order** - No execution order config
5. **File names are self-documenting** - No separate documentation needed

**Result:**
- Less boilerplate
- Faster development
- Better discoverability
- Enforced consistency
- Easier maintenance

**The folder structure IS the configuration.**

---

**Next Steps:**
- [Feature-First Architecture Guide](./feature-first-architecture.md)
- [express-numflow README](../README.md)
- [Todo App Example](../examples/todo-app/)
