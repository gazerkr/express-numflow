# Global Error Handler Example

> **English** | [한국어](./README.ko.md)

This example demonstrates how to implement a global error handler using `app.use()`.

## What is a Global Error Handler?

A global error handler is an Express middleware that centrally handles errors from all routes and features in your application.

### Differences from Lifecycle Hooks

| Feature | Global Error Handler | onError (Lifecycle Hook) |
|---------|---------------------|--------------------------|
| Scope | Entire application | Individual feature |
| Location | Defined once in app.js | Defined in each feature/index.js |
| Priority | Low (last line of defense) | High (feature-level handling) |
| Use Case | Common error handling | Feature-specific custom handling |

**Combined Usage:**
- If onError is defined, errors are handled at the feature level
- If onError is absent or errors propagate, global handler catches them

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

### 1. GET /users - List Users

Get all users.

```bash
curl http://localhost:3000/users
```

**Response:**
```json
{
  "success": true,
  "count": 2,
  "users": [
    { "id": "1", "name": "Alice", "email": "alice@example.com" },
    { "id": "2", "name": "Bob", "email": "bob@example.com" }
  ]
}
```

### 2. POST /users - Create User

Create a new user. Validation and duplicate errors are handled by the global handler.

**Success Request:**
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Charlie",
    "email": "charlie@example.com"
  }'
```

**Validation Error (400) - Handled by Global Handler:**
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "",
    "email": "invalid-email"
  }'
```

**Response:**
```json
{
  "success": false,
  "error": "Bad Request",
  "message": "User validation failed",
  "errors": [
    "Name is required",
    "Email format is invalid"
  ]
}
```

**Duplicate Error (409) - Handled by Global Handler:**
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice",
    "email": "alice@example.com"
  }'
```

### 3. GET /posts - List Posts

Get all posts.

```bash
curl http://localhost:3000/posts
```

### 4. GET /posts/:id - Get Post

Get a specific post. 404 errors are handled by the global handler.

**Success Request:**
```bash
curl http://localhost:3000/posts/1
```

**404 Error - Handled by Global Handler:**
```bash
curl http://localhost:3000/posts/999
```

**Response:**
```json
{
  "success": false,
  "error": "Not Found",
  "message": "Post with ID 999 not found"
}
```

## Global Error Handler Implementation

### Define in app.js

```javascript
// Must be defined after all routes
app.use((err, req, res, next) => {
  console.log('🚨 GLOBAL ERROR HANDLER TRIGGERED')

  // If response already sent
  if (res.headersSent) {
    return next(err)
  }

  // Handle different error types
  if (err.message.includes('validation') || err.errors) {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: err.message,
      errors: err.errors || []
    })
  }

  if (err.message.includes('not found')) {
    return res.status(404).json({
      success: false,
      error: 'Not Found',
      message: err.message
    })
  }

  // Default 500 error
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: err.message
  })
})
```

### Throw Errors in Features

Without defining feature-level onError, all errors automatically propagate to the global handler.

```javascript
// features/users/@post/steps/100-validate.js
export default async (ctx, req, res) => {
  const validation = validateUserData(ctx.userData)

  if (!validation.valid) {
    // Throw error - global handler will catch it
    const error = new Error('User validation failed')
    error.errors = validation.errors
    throw error
  }
}
```

## Error Handling Flow

```
Error thrown in step
  ↓
Does feature have onError?
  ├─ Yes → Handled in onError (end)
  └─ No → Propagates to global handler
           ↓
      Handled in global handler
```

## Key Concepts

### 1. Centralized Error Handling

Manage common error handling logic in one place for all features.

**Advantages:**
- Consistent error response format
- Reduced code duplication
- Easy maintenance

### 2. Error Type Detection

Return appropriate HTTP status codes based on error messages or properties:

- `validation` or `errors` property → 400 Bad Request
- `not found` → 404 Not Found
- `already exists` or `duplicate` → 409 Conflict
- Others → 500 Internal Server Error

### 3. Four Parameters Required

Express recognizes middleware with exactly 4 parameters as an error handler:

```javascript
app.use((err, req, res, next) => {
  // All 4 parameters (err, req, res, next) are required
})
```

### 4. Order Matters

Global error handler must be defined **after** all routes and middleware:

```javascript
// 1. Regular middleware
app.use(express.json())

// 2. Routes
app.use(numflow({ ... }))

// 3. Global error handler (last!)
app.use((err, req, res, next) => { ... })
```

## File Structure

```
global-error-handler/
├── package.json          # ESM config and dependencies
├── app.js               # Express server + global error handler
├── db.js                # In-memory database
├── lib/
│   └── validators.js    # Validation utilities
└── features/
    ├── users/
    │   ├── @get/        # GET /users
    │   │   └── steps/
    │   │       └── 100-list-users.js
    │   └── @post/       # POST /users
    │       └── steps/
    │           ├── 100-validate.js    # Throws errors
    │           └── 200-create-user.js
    └── posts/
        ├── @get/        # GET /posts
        │   └── steps/
        │       └── 100-list-posts.js
        └── [id]/
            └── @get/    # GET /posts/:id
                └── steps/
                    ├── 100-fetch-post.js  # Throws 404 errors
                    └── 200-respond.js
```

## Key Takeaways

1. **Global handler is the last line of defense**: Catches all errors not handled at feature level
2. **Centralized management**: Common error logic managed in one place
3. **Consistent responses**: All errors use the same response format
4. **Simplified features**: Features don't need onError for basic error handling
5. **Flexibility**: Add onError to specific features when custom handling is needed

## When to Use?

### Use Global Error Handler When:
- You need consistent error responses across all features
- You want to manage error handling logic centrally
- You're building simple CRUD APIs quickly

### Use onError (Lifecycle Hook) When:
- Different features need different error handling
- A specific feature requires complex error handling
- Error conditions need special business logic

## Next Steps

- [lifecycle-hooks](../lifecycle-hooks) - Feature-level error handling with contextInitializer and onError
- [basic-esm](../basic-esm) - Basic express-numflow usage
