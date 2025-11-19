# Todo App Example

A complete Todo application built with **express-numflow** demonstrating Feature-First architecture.

## Features

- ✅ Create, Read, Update, Delete todos
- ✅ Mark todos as completed
- ✅ In-memory database (no external dependencies)
- ✅ Clean folder structure using Convention over Configuration
- ✅ Step-by-step business logic execution

## Project Structure

```
todo-app/
├── server.js              # Express server
├── db.js                  # In-memory database
└── features/
    └── todos/
        ├── @get/          # GET /todos - List all todos
        │   └── steps/
        │       ├── 100-fetch-todos.js
        │       └── 200-send-response.js
        ├── @post/         # POST /todos - Create todo
        │   └── steps/
        │       ├── 100-validate.js
        │       ├── 200-create-todo.js
        │       └── 300-send-response.js
        └── [id]/
            ├── @get/      # GET /todos/:id - Get single todo
            │   └── steps/
            │       ├── 100-fetch-todo.js
            │       └── 200-send-response.js
            ├── @put/      # PUT /todos/:id - Update todo
            │   └── steps/
            │       ├── 100-validate.js
            │       ├── 200-update-todo.js
            │       └── 300-send-response.js
            ├── @delete/   # DELETE /todos/:id - Delete todo
            │   └── steps/
            │       ├── 100-delete-todo.js
            │       └── 200-send-response.js
            └── complete/
                └── @patch/ # PATCH /todos/:id/complete - Mark as completed
                    └── steps/
                        ├── 100-mark-completed.js
                        └── 200-send-response.js
```

## How It Works

### Convention over Configuration

The folder structure automatically defines the HTTP methods and routes:

- `todos/@get/` → `GET /todos`
- `todos/@post/` → `POST /todos`
- `todos/[id]/@get/` → `GET /todos/:id`
- `todos/[id]/@put/` → `PUT /todos/:id`
- `todos/[id]/@delete/` → `DELETE /todos/:id`
- `todos/[id]/complete/@patch/` → `PATCH /todos/:id/complete`

### Sequential Steps

Each feature executes steps in numerical order:

**Example: Creating a Todo (POST /todos)**

1. `100-validate.js` - Validate request body
2. `200-create-todo.js` - Create todo in database
3. `300-send-response.js` - Send success response

## Running the Example

### 1. Build the project (from root directory)

```bash
npm run build
```

### 2. Start the server

```bash
cd examples/todo-app
node server.js
```

The server will start on `http://localhost:3000`

## API Examples

### Create a todo

```bash
curl -X POST http://localhost:3000/todos \
  -H "Content-Type: application/json" \
  -d '{"title": "Buy groceries"}'
```

Response:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Buy groceries",
    "completed": false,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Get all todos

```bash
curl http://localhost:3000/todos
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Buy groceries",
      "completed": false,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

### Get a specific todo

```bash
curl http://localhost:3000/todos/1
```

### Update a todo

```bash
curl -X PUT http://localhost:3000/todos/1 \
  -H "Content-Type: application/json" \
  -d '{"title": "Buy groceries and cook dinner"}'
```

### Mark todo as completed

```bash
curl -X PATCH http://localhost:3000/todos/1/complete
```

### Delete a todo

```bash
curl -X DELETE http://localhost:3000/todos/1
```

## Path Aliasing

This example uses Node.js built-in **subpath imports** to avoid long relative paths.

### Before (Long Relative Paths)

```javascript
// features/todos/[id]/complete/@patch/steps/100-mark-completed.js
const db = require('../../../../../../db')  // 😱 Too many ../
```

### After (Clean Aliases)

```javascript
// features/todos/[id]/complete/@patch/steps/100-mark-completed.js
const db = require('#db')  // ✅ Much better!
```

### How It Works

See `package.json`:

```json
{
  "imports": {
    "#db": "./db.js",
    "#lib/*": "./lib/*"
  }
}
```

**Requirements:** Node.js >= 14.6.0

For more path aliasing strategies, see the [Path Aliasing Guide](../../docs/path-aliasing.md).

---

## Key Concepts Demonstrated

### 1. Convention over Configuration

No configuration files needed - the folder structure defines everything!

### 2. Sequential Steps

Complex operations are broken down into simple, testable steps:

```javascript
// 100-validate.js
module.exports = async (ctx, req, res) => {
  if (!req.body.title) {
    return res.status(400).json({ error: 'Title required' })
  }
  ctx.title = req.body.title
}

// 200-create-todo.js
module.exports = async (ctx, req, res) => {
  ctx.todo = db.create({ title: ctx.title })
}

// 300-send-response.js
module.exports = async (ctx, req, res) => {
  res.status(201).json({ success: true, data: ctx.todo })
}
```

### 3. Shared Context

All steps share the same `ctx` object for passing data between steps.

### 4. Dynamic Routes

`[id]` folders automatically become route parameters (`:id`).

## Learn More

- [express-numflow Documentation](../../README.md)
- [Feature-First Architecture](../../README.md#-convention-over-configuration)
- [Steps Pattern](../../README.md#-steps-sequential-execution)

## License

MIT
