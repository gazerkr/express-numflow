# express-numflow Examples

> [한국어 문서](./README.ko.md)

This directory contains examples demonstrating various ways to use express-numflow.

## Basic Examples

Three examples implementing the same functionality in different approaches:

### 1. [CJS (CommonJS)](./basic-cjs/)
- ✅ Uses `require`/`module.exports`
- ✅ Short paths with `module-alias`
- ✅ Run directly with Node.js

```bash
cd basic-cjs
npm install
npm start
```

### 2. [ESM (ES Modules)](./basic-esm/)
- ✅ Uses `import`/`export`
- ✅ Short paths with `package.json` imports
- ✅ Run directly with Node.js (no transpilation needed)

```bash
cd basic-esm
npm install
npm start
```

### 3. [TypeScript](./basic-ts/)
- ✅ Full TypeScript support
- ✅ Short paths with `tsconfig.json` paths
- ✅ Run directly with `tsx`
- ✅ Type-safe Context sharing

```bash
cd basic-ts
npm install
npm run dev
```

## Production-Ready Example

### [Todo App](./todo-app/)
Full-featured todo application:
- ✅ CRUD operations
- ✅ Feature-First architecture
- ✅ Error handling
- ✅ Integration tests

```bash
cd todo-app
npm install
npm start
```

## Example Comparison

| Feature | CJS | ESM | TypeScript |
|---------|-----|-----|------------|
| Import/Export | `require`/`module.exports` | `import`/`export` | `import`/`export` with types |
| Short Path | `module-alias` | package.json imports | tsconfig.json paths |
| Setup | `require('module-alias/register')` | `"type": "module"` | tsconfig.json |
| Run Command | `node app.js` | `node app.js` | `tsx app.ts` |
| Transpile | Not needed | Not needed | Auto-handled by tsx |
| Type Safety | ❌ | ❌ | ✅ |

## Common API Endpoints

All basic examples provide the same API:

```bash
# Health check
GET /health

# Get all posts
GET /posts

# Create a post
POST /posts
{
  "title": "My Post",
  "content": "Post content...",
  "author": "John Doe"
}

# Get a post by ID
GET /posts/:id
```

## Local Development Testing

To test these examples locally:

```bash
# 1. First build express-numflow
cd /path/to/express-numflow
npm run build

# 2. Navigate to example directory
cd examples/basic-cjs

# 3. Install dependencies
npm install

# 4. Start server
npm start
```

## Next Steps

1. Read each example's README for detailed explanations
2. Modify code to learn
3. Apply to your own projects

## Learn More

- [API Reference](../docs/api-reference.md)
- [Feature-First Architecture Guide](../docs/feature-first-architecture.md)
- [Path Aliasing Guide](../docs/path-aliasing.md)
