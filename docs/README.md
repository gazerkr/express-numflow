# express-numflow Documentation

Welcome to the express-numflow documentation!

## Available Documentation

### Getting Started

- [../README.md](../README.md) - English documentation
- [../README.ko.md](../README.ko.md) - Korean documentation (한글 문서)

### License

- [../LICENSE](../LICENSE) - MIT License

## Quick Links

### Installation

```bash
npm install express express-numflow
```

### Basic Usage

#### Option 1: Router Plugin (Recommended)

```javascript
const express = require("express");
const { createFeatureRouter } = require("express-numflow");

const app = express();
app.use(express.json());

const featureRouter = await createFeatureRouter("./features");
app.use(featureRouter);

app.listen(3000);
```

#### Option 2: Express Extension (Numflow-style)

```javascript
const express = require("express");
const { extendExpress } = require("express-numflow/extend");

extendExpress(express);

const app = express();
app.use(express.json());

await app.registerFeatures("./features");

app.listen(3000);
```

## Core Concepts

### Convention over Configuration

Folder structure defines your API automatically:

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

## API Reference

### `createFeatureRouter(featuresDir, options?)`

Create an Express Router from features directory.

**Parameters:**

- `featuresDir` (string): Path to features directory
- `options` (object, optional):
  - `indexPatterns` (string[]): Index file patterns (default: `['index.js', 'index.ts', 'index.mjs', 'index.mts']`)
  - `excludeDirs` (string[]): Directories to exclude (default: `['node_modules', '.git', 'dist', 'build']`)
  - `debug` (boolean): Enable debug logging (default: `false`)
  - `routerOptions` (object): Express Router options

**Returns:** `Promise<Router>`

### `extendExpress(express)`

Extend Express.application with `registerFeatures()` method.

**Parameters:**

- `express` (object): Express module

## express-numflow vs Numflow

| Feature                  | express-numflow          | Numflow                      |
| ------------------------ | ------------------------ | ---------------------------- |
| Feature-First            | [Good]                   | [Good]                       |
| Convention over Config   | [Good]                   | [Good]                       |
| Express Compatible       | [Good]                   | [Good]                       |
| High-Performance Routing | [Bad] (uses Express router) | [Good] (Radix Tree, 3.3x faster) |
| Drop-in Replacement      | [Good]                   | [Note] (requires migration)  |
| Use Case                 | Gradual adoption         | New projects, full migration |

## Support

- [GitHub Issues](https://github.com/your-org/express-numflow/issues) - Bug reports and feature requests
- [Discussions](https://github.com/your-org/express-numflow/discussions) - Questions and discussions
- [Numflow Documentation](https://numflow.dev) - Learn about Numflow framework

## Additional Resources

### Examples

Check the `examples/` directory for complete working examples:

- Basic usage
- Express integration
- Dynamic routes
- Error handling
- Async tasks

### Related Projects

- [Numflow](https://github.com/your-org/numflow) - High-performance web framework with Feature-First architecture
- [Express](https://expressjs.com/) - Fast, unopinionated web framework for Node.js

---

**Last updated:** 2025-01-18
**Version:** 0.1.0

---

Made with love by Numflow Team
