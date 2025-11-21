# Lifecycle Hooks Example

> **English** | [한국어](./README.ko.md)

This example demonstrates how to use `contextInitializer` and `onError` lifecycle hooks in `express-numflow`.

## What are Lifecycle Hooks?

Lifecycle hooks are functions that run at specific points in a feature's execution flow:

- **`contextInitializer`**: Runs **before** all steps are executed
- **`onError`**: Runs when an error occurs anywhere in the feature

## Installation and Running

```bash
# Install dependencies
npm install

# Start server
npm start

# Development mode (auto-restart)
npm run dev
```

Server will run at `http://localhost:3000`.

## API Endpoints

### 1. POST /users - Create User

Full lifecycle demo showing authentication + validation + duplicate checking

**Lifecycle Flow:**
```
contextInitializer (auth, logging)
  ↓
Step 100 (validation)
  ↓
Step 200 (create user)
  ↓
Success or onError (if error occurs)
```

**Success Request:**
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer user-token" \
  -d '{
    "name": "Charlie",
    "email": "charlie@example.com"
  }'
```

**Validation Error (400):**
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer user-token" \
  -d '{
    "name": "",
    "email": "invalid-email"
  }'
```

**Authentication Error (401):**
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Charlie",
    "email": "charlie@example.com"
  }'
```

**Duplicate Error (409):**
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer user-token" \
  -d '{
    "name": "Alice",
    "email": "alice@example.com"
  }'
```

### 2. GET /users/:id - Get User

Shows authentication and 404 handling.

**Success Request:**
```bash
curl http://localhost:3000/users/1 \
  -H "Authorization: Bearer user-token"
```

**404 Error:**
```bash
curl http://localhost:3000/users/999 \
  -H "Authorization: Bearer user-token"
```

### 3. POST /posts - Create Post (Admin Only)

Demonstrates role-based access control.

**Success Request (admin token):**
```bash
curl -X POST http://localhost:3000/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin-token" \
  -d '{
    "title": "New Post",
    "content": "This is a new post"
  }'
```

**Permission Error (403 - regular user):**
```bash
curl -X POST http://localhost:3000/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer user-token" \
  -d '{
    "title": "New Post",
    "content": "This is a new post"
  }'
```

## Key Concepts

### contextInitializer

Runs before all steps are executed. Use it for:

- User authentication
- Request logging
- Context data initialization
- Permission checks

**Example:**
```javascript
export default feature({
  contextInitializer: (ctx, req, res) => {
    // 1. Authenticate user
    ctx.user = authenticateUser(req)

    // 2. Log request
    logRequest(ctx, req)

    // 3. Prepare data
    ctx.userData = req.body
  },
  // ...
})
```

### onError

Runs when an error occurs anywhere in the feature:

- Errors in contextInitializer
- Errors in any step
- Errors in async-tasks

**Example:**
```javascript
export default feature({
  // ...
  onError: async (error, ctx, req, res) => {
    // Log error
    logError(error, ctx, req)

    // Handle different error types
    if (error.message.includes('Authorization')) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized'
      })
    } else if (error.message.includes('validation')) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors: error.errors
      })
    }
    // ... more error types
  }
})
```

## File Structure

```
lifecycle-hooks/
├── package.json          # ESM config and dependencies
├── app.js               # Express server setup
├── db.js                # In-memory database
├── lib/
│   ├── auth.js          # Authentication utilities
│   ├── logger.js        # Logging utilities
│   └── validators.js    # Validation utilities
└── features/
    ├── users/
    │   ├── @post/       # POST /users
    │   │   ├── index.js           # Lifecycle hooks
    │   │   └── steps/
    │   │       ├── 100-validate.js
    │   │       └── 200-create-user.js
    │   └── [id]/
    │       └── @get/    # GET /users/:id
    │           ├── index.js       # Lifecycle hooks
    │           └── steps/
    │               ├── 100-fetch-user.js
    │               └── 200-respond.js
    └── posts/
        └── @post/       # POST /posts
            ├── index.js           # Lifecycle hooks (role-based)
            └── steps/
                ├── 100-validate.js
                └── 200-create-post.js
```

## Authentication Tokens

Use these predefined tokens for testing:

- **Regular User**: `Bearer user-token`
  - User: Bob (id: 2)
  - Role: user

- **Admin**: `Bearer admin-token`
  - User: Alice (id: 1)
  - Role: admin

## Key Takeaways

1. **contextInitializer** runs once before all steps
2. **onError** handles errors from anywhere in the feature
3. **Error propagation**: Errors thrown in steps automatically reach onError
4. **Context sharing**: The ctx object is shared across all lifecycle phases
5. **Fine-grained control**: Customize error handling per feature

## Next Steps

- [global-error-handler](../global-error-handler) - Global error handling with app.use()
- [basic-esm](../basic-esm) - Basic express-numflow usage
