# Path Aliasing Guide

## Table of Contents

- [The Problem](#the-problem)
- [Solution 1: Node.js Subpath Imports (Recommended)](#solution-1-nodejs-subpath-imports-recommended)
- [Solution 2: module-alias Package](#solution-2-module-alias-package)
- [Solution 3: TypeScript Paths](#solution-3-typescript-paths)
- [Comparison](#comparison)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)

---

## The Problem

In Feature-First architecture, deep folder nesting can lead to **long, error-prone relative paths**:

```javascript
// features/api/v2/users/[id]/posts/[postId]/comments/@post/steps/100-validate.js

const db = require('../../../../../../../../../db')  // [Bad]
const { sendEmail } = require('../../../../../../../../../lib/email')  // [Bad]
const { validate } = require('../../../../../../../../../lib/validators')  // [Bad]
```

**Problems:**
- Hard to read and maintain
- Easy to make mistakes (wrong number of `../`)
- Breaks when you move files
- IDE autocomplete doesn't work well
- Refactoring becomes painful

---

## Solution 1: Node.js Subpath Imports (Recommended)

**Available:** Node.js >= 14.6.0
**Zero Dependencies** [Good]

### Setup

Add `imports` field to `package.json`:

```json
{
  "name": "my-app",
  "imports": {
    "#db": "./db.js",
    "#lib/*": "./lib/*.js",
    "#utils/*": "./utils/*.js",
    "#config": "./config/index.js"
  }
}
```

### Usage

```javascript
// Before
const db = require('../../../../../../../../../db')
const { sendEmail } = require('../../../../../../../../../lib/email')
const { validateEmail } = require('../../../../../../../../../lib/validators')

// After
const db = require('#db')
const { sendEmail } = require('#lib/email')
const { validateEmail } = require('#lib/validators')
```

### Pros

[Good] **Zero dependencies** - Built into Node.js
[Good] **Standard** - Official Node.js feature
[Good] **Works everywhere** - No build step needed
[Good] **Fast** - No runtime overhead
[Good] **Simple** - Just modify package.json

### Cons

[Bad] **Requires Node.js 14.6+**
[Bad] **Must start with `#`** - Can't use `@` or plain names
[Bad] **Package-scoped only** - Can't alias external packages

### Example: Todo App

**package.json:**
```json
{
  "name": "todo-app",
  "imports": {
    "#db": "./db.js",
    "#lib/*": "./lib/*"
  }
}
```

**Usage:**
```javascript
// features/todos/[id]/complete/@patch/steps/100-mark-completed.js
const db = require('#db')  // [Good] Clean!

module.exports = async (ctx, req, res) => {
  const todo = db.markAsCompleted(req.params.id)
  ctx.todo = todo
}
```

---

## Solution 2: module-alias Package

**Package:** [module-alias](https://www.npmjs.com/package/module-alias)
**Works with:** Any Node.js version

### Setup

#### 1. Install

```bash
npm install module-alias
```

#### 2. Configure package.json

```json
{
  "name": "my-app",
  "_moduleAliases": {
    "@root": ".",
    "@db": "./db.js",
    "@lib": "./lib",
    "@utils": "./utils",
    "@config": "./config"
  }
}
```

#### 3. Register aliases (in your entry file)

```javascript
// server.js (or index.js)
require('module-alias/register')  // [Note] Must be first!

const express = require('express')
const db = require('@db')  // Now works!

// Rest of your code...
```

### Usage

```javascript
// Before
const db = require('../../../../../../../../../db')
const { sendEmail } = require('../../../../../../../../../lib/email')

// After
const db = require('@db')
const { sendEmail } = require('@lib/email')
```

### Pros

[Good] **Works with older Node.js** - No version requirement
[Good] **Flexible prefixes** - Use `@`, `~`, or anything
[Good] **Can alias node_modules** - Alias external packages too
[Good] **Well-tested** - Popular package with 2M+ downloads/week

### Cons

[Bad] **Extra dependency**
[Bad] **Requires registration** - Must call `require('module-alias/register')`
[Bad] **Runtime overhead** - Hooks into Node's module system
[Bad] **Can cause issues** - Some tools don't understand it (Jest, bundlers)

### Example

**package.json:**
```json
{
  "name": "my-app",
  "_moduleAliases": {
    "@root": ".",
    "@db": "./db.js",
    "@lib": "./lib",
    "@features": "./features"
  }
}
```

**server.js:**
```javascript
require('module-alias/register')  // Must be first!

const express = require('express')
const db = require('@db')
const { createFeatureRouter } = require('express-numflow')

const app = express()
app.use(express.json())

const featureRouter = await createFeatureRouter('@features')
app.use(featureRouter)

app.listen(3000)
```

**Step file:**
```javascript
// features/users/@post/steps/200-create-user.js
const db = require('@db')
const { sendEmail } = require('@lib/email')

module.exports = async (ctx, req, res) => {
  const user = await db.users.create(ctx.userData)
  await sendEmail(user.email, 'Welcome!')
  ctx.user = user
}
```

---

## Solution 3: TypeScript Paths

**For:** TypeScript projects
**Requires:** TypeScript + bundler or ts-node

### Setup

#### 1. Configure tsconfig.json

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@db": ["./db"],
      "@lib/*": ["./lib/*"],
      "@utils/*": ["./utils/*"],
      "@features/*": ["./features/*"]
    }
  }
}
```

#### 2. For Production (choose one)

**Option A: Use tsconfig-paths**

```bash
npm install tsconfig-paths
```

```javascript
// server.ts
import 'tsconfig-paths/register'  // Must be first

import express from 'express'
import db from '@db'  // Works!
```

**Option B: Use a bundler**

Bundlers (webpack, esbuild, etc.) understand TypeScript paths automatically.

### Usage

```typescript
// Before
import db from '../../../../../../../../../db'
import { sendEmail } from '../../../../../../../../../lib/email'

// After
import db from '@db'
import { sendEmail } from '@lib/email'
```

### Pros

[Good] **Full IDE support** - VSCode autocomplete works perfectly
[Good] **Type-safe** - TypeScript knows about your aliases
[Good] **Flexible** - Can map any path
[Good] **Bundler-friendly** - webpack, esbuild understand it

### Cons

[Bad] **TypeScript only** - Doesn't work in plain JavaScript
[Bad] **Requires runtime support** - Need tsconfig-paths or bundler
[Bad] **Build step needed** - Can't run .ts files directly (usually)

### Example

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "baseUrl": ".",
    "paths": {
      "@db": ["./db"],
      "@lib/*": ["./lib/*"],
      "@config": ["./config"]
    }
  }
}
```

**Step file:**
```typescript
// features/users/@post/steps/200-create-user.ts
import db from '@db'
import { sendEmail } from '@lib/email'
import { User } from '@lib/types'

export default async (ctx: any, req: any, res: any) => {
  const user: User = await db.users.create(ctx.userData)
  await sendEmail(user.email, 'Welcome!')
  ctx.user = user
}
```

---

## Comparison

| Feature | Subpath Imports (#) | module-alias (@) | TypeScript paths |
|---------|-------------------|-----------------|------------------|
| **Node.js Version** | >= 14.6.0 | Any | Any (with ts-node) |
| **Dependencies** | None | 1 package | tsconfig-paths or bundler |
| **Setup Complexity** | Easy | Medium | Medium |
| **Performance** | Best (native) | Good | Good (after build) |
| **Prefix** | Must use `#` | Any (`@`, `~`, etc) | Any |
| **IDE Support** | Good | Good | Excellent |
| **TypeScript** | Works | Works | Native |
| **Plain JavaScript** | [Good] Yes | [Good] Yes | [Bad] No |
| **Runtime overhead** | None | Minimal | None (bundled) |
| **Tooling compatibility** | Excellent | Good | Excellent |

---

## Best Practices

### 1. **Choose One Strategy**

Don't mix multiple strategies - pick one and stick with it:

```javascript
// [Bad]: Mixing strategies
const db = require('#db')           // Subpath imports
const utils = require('@utils')     // module-alias
import config from '@/config'       // TypeScript

// [Good]: Consistent
const db = require('#db')
const utils = require('#utils')
const config = require('#config')
```

### 2. **Use Descriptive Aliases**

Make it clear what each alias represents:

```json
// [Good]
{
  "imports": {
    "#db": "./database/index.js",
    "#models/*": "./database/models/*.js",
    "#lib/*": "./lib/*.js",
    "#utils/*": "./utils/*.js"
  }
}

// [Bad]: Unclear
{
  "imports": {
    "#d": "./database/index.js",
    "#m/*": "./database/models/*.js",
    "#l/*": "./lib/*.js"
  }
}
```

### 3. **Document Your Aliases**

Add a comment in package.json:

```json
{
  "name": "my-app",
  "imports": {
    // Core
    "#db": "./db.js",

    // Libraries
    "#lib/*": "./lib/*.js",
    "#utils/*": "./utils/*.js",

    // Configuration
    "#config": "./config/index.js"
  }
}
```

### 4. **Alias Shared Code, Not Features**

Alias commonly used modules, not feature-specific code:

```json
// [Good]: Shared utilities
{
  "imports": {
    "#db": "./db.js",
    "#lib/*": "./lib/*.js",
    "#utils/*": "./utils/*.js"
  }
}

// [Bad]: Feature-specific
{
  "imports": {
    "#users-feature": "./features/users",
    "#orders-feature": "./features/orders"
  }
}
```

**Why?** Features should be self-contained. If Feature A depends on Feature B, you might have a design problem.

### 5. **Keep Relative Paths for Same-Feature Imports**

Use aliases for cross-cutting concerns, relative paths within a feature:

```javascript
// [Good]: Same feature, use relative path
// features/users/@post/steps/200-create-user.js
const helpers = require('../helpers')  // Same feature

// [Good]: Shared code, use alias
const db = require('#db')              // Shared across features
```

---

## Common Patterns

### Pattern 1: Database + Libraries

```json
{
  "imports": {
    "#db": "./database/index.js",
    "#lib/*": "./lib/*.js"
  }
}
```

```javascript
// Any step file
const db = require('#db')
const { sendEmail } = require('#lib/email')
const { validateEmail } = require('#lib/validators')
```

### Pattern 2: Organized by Type

```json
{
  "imports": {
    "#db": "./db.js",
    "#models/*": "./models/*.js",
    "#services/*": "./services/*.js",
    "#utils/*": "./utils/*.js",
    "#config": "./config/index.js"
  }
}
```

```javascript
const db = require('#db')
const User = require('#models/User')
const emailService = require('#services/email')
const { formatDate } = require('#utils/date')
const config = require('#config')
```

### Pattern 3: Feature + Shared

```json
{
  "imports": {
    "#shared/*": "./shared/*.js",
    "#db": "./db.js"
  }
}
```

```javascript
const db = require('#db')
const { validateInput } = require('#shared/validators')
const { logger } = require('#shared/logger')
```

---

## Migration Guide

### Migrating from Relative Paths

**Step 1:** Add imports to package.json

```json
{
  "imports": {
    "#db": "./db.js",
    "#lib/*": "./lib/*.js"
  }
}
```

**Step 2:** Find and replace

Use your IDE's find and replace (with regex):

**Find:**
```
require\('\.\.\/+db'\)
```

**Replace:**
```
require('#db')
```

**Step 3:** Test

```bash
npm test
node server.js
```

**Step 4:** Commit

```bash
git add .
git commit -m "refactor: use path aliases instead of relative paths"
```

---

## Troubleshooting

### "Cannot find module '#db'"

**Cause:** Node.js version < 14.6.0 or package.json not in the right place

**Solution:**
```bash
# Check Node.js version
node --version  # Should be >= 14.6.0

# Make sure package.json is in project root
ls package.json  # Should exist

# Make sure imports field exists
cat package.json | grep imports
```

### "Module not found: package subpath"

**Cause:** Path in imports doesn't exist

**Solution:** Check that the file exists:
```bash
# If your imports has:
# "#db": "./db.js"

# Make sure this exists:
ls db.js  # Should exist
```

### IDE shows "Cannot find module"

**Cause:** IDE doesn't understand subpath imports

**Solution:** Restart IDE or add jsconfig.json/tsconfig.json:

```json
// jsconfig.json (for JavaScript projects)
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "#db": ["./db.js"],
      "#lib/*": ["./lib/*"]
    }
  }
}
```

---

## Summary

**Recommendation:**

1. **For new projects (Node.js >= 14.6):** Use **Subpath Imports** (`#`)
2. **For older Node.js:** Use **module-alias** (`@`)
3. **For TypeScript:** Use **TypeScript paths** + tsconfig-paths

**Quick Start:**

```json
{
  "imports": {
    "#db": "./db.js",
    "#lib/*": "./lib/*.js"
  }
}
```

```javascript
const db = require('#db')
const { sendEmail } = require('#lib/email')
```

**That's it!** No more `../../../../../../`

---

**See also:**
- [Feature-First Architecture Guide](./feature-first-architecture.md)
- [Convention over Configuration](./convention-over-configuration.md)
- [Todo App Example](../examples/todo-app/)
