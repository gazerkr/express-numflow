/**
 * Convention over Configuration for Feature-First
 *
 * Automatically infers method, path, steps, asyncTasks from folder structure.
 *
 * Folder structure rules:
 * /features/{resource}/@{method}/
 *
 * The @ prefix explicitly marks HTTP method folders, eliminating ambiguity
 * with resource names like "steps", "get", "post", etc.
 *
 * Examples:
 * /features/orders/@post/              -> POST /orders
 * /features/api/v1/users/@get/         -> GET /api/v1/users
 * /features/users/[id]/@put/           -> PUT /users/:id
 * /features/workflows/[id]/steps/@get/ -> GET /workflows/:id/steps (no conflict!)
 *
 * Implicit Feature (no index.js required):
 * /features/todos/@get/
 *   └── steps/
 *       └── 100-list.js
 *
 * Explicit Feature (with index.js for configuration):
 * /features/todos/@post/
 *   ├── index.js          <- contextInitializer, middlewares, etc.
 *   └── steps/
 *       └── 100-create.js
 */

import * as path from 'path'
import * as fs from 'fs'

/**
 * HTTP Method type
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/**
 * HTTP method folder name mapping
 */
const METHOD_MAP: Record<string, HttpMethod> = {
  'get': 'GET',
  'post': 'POST',
  'put': 'PUT',
  'patch': 'PATCH',
  'delete': 'DELETE',
}

/**
 * Convention Resolver
 * Automatically infers Feature configuration from folder structure.
 */
export class ConventionResolver {
  /**
   * Features base directory cache
   * key: startPath, value: features directory path
   */
  private static featuresBaseDirCache: Map<string, string> = new Map()

  /**
   * Infer HTTP method from folder name (with @ prefix)
   *
   * @param dirPath - Feature directory path
   * @returns HTTP method (GET, POST, PUT, PATCH, DELETE)
   * @throws {Error} Invalid method name
   *
   * @example
   * inferMethod('/features/orders/@post') // -> 'POST'
   * inferMethod('/features/users/@get')   // -> 'GET'
   */
  static inferMethod(dirPath: string): HttpMethod {
    const dirName = path.basename(dirPath)

    // Check @ prefix
    if (!dirName.startsWith('@')) {
      throw new Error(
        `Feature folder must start with @: "${dirName}". ` +
        `Valid examples: @get, @post, @put, @patch, @delete`
      )
    }

    const methodName = dirName.substring(1).toLowerCase()
    const method = METHOD_MAP[methodName]

    if (!method) {
      throw new Error(
        `Invalid HTTP method: "@${methodName}". ` +
        `Must be one of: ${Object.keys(METHOD_MAP).map(m => '@' + m).join(', ')}`
      )
    }

    return method
  }

  /**
   * Infer API path from folder structure
   *
   * @param dirPath - Feature directory path
   * @param featuresBase - features base directory path
   * @returns API path (e.g. /api/v1/orders)
   *
   * @example
   * inferPath('/features/orders/@post', '/features')
   * // -> '/orders'
   *
   * inferPath('/features/api/v1/orders/@post', '/features')
   * // -> '/api/v1/orders'
   *
   * inferPath('/features/users/[id]/@get', '/features')
   * // -> '/users/:id'
   *
   * inferPath('/features/workflows/[id]/steps/@get', '/features')
   * // -> '/workflows/:id/steps' (no conflict with "steps" resource name!)
   */
  static inferPath(dirPath: string, featuresBase: string): string {
    const relativePath = path.relative(featuresBase, dirPath)
    const segments = relativePath.split(path.sep)

    // Validate: Folder names cannot contain spaces
    for (const segment of segments) {
      if (segment.includes(' ')) {
        throw new Error(
          `Folder names cannot contain spaces: "${segment}". ` +
          `Use hyphens (-) or underscores (_) instead. ` +
          `Example: "user-profile" or "user_profile"`
        )
      }
    }

    // Exclude last segment if it starts with @ (HTTP method folder)
    if (segments.length > 0 && segments[segments.length - 1].startsWith('@')) {
      segments.pop()
    }

    // Convert dynamic routes ([id] -> :id)
    const pathSegments = segments.map(segment => this.parseDynamicRoute(segment))

    return '/' + pathSegments.join('/')
  }

  /**
   * Parse dynamic route
   * [id] -> :id
   * [userId] -> :userId
   *
   * @param segment - Path segment
   * @returns Converted segment
   *
   * @example
   * parseDynamicRoute('[id]') // -> ':id'
   * parseDynamicRoute('[userId]') // -> ':userId'
   * parseDynamicRoute('orders') // -> 'orders'
   */
  static parseDynamicRoute(segment: string): string {
    const match = segment.match(/^\[([^\]]+)\]$/)
    return match ? `:${match[1]}` : segment
  }

  /**
   * Auto-search for steps folder
   *
   * @param featureDir - Feature directory path
   * @returns steps folder path or null
   *
   * @example
   * findStepsDir('/features/orders/post')
   * // -> './steps' (if folder exists)
   * // -> null (if folder doesn't exist)
   */
  static findStepsDir(featureDir: string): string | null {
    const stepsDir = path.join(featureDir, 'steps')

    if (fs.existsSync(stepsDir) && fs.statSync(stepsDir).isDirectory()) {
      return './steps'
    }

    return null
  }

  /**
   * Auto-search for async-tasks folder
   *
   * @param featureDir - Feature directory path
   * @returns async-tasks folder path or null
   *
   * @example
   * findAsyncTasksDir('/features/orders/post')
   * // -> './async-tasks' (if folder exists)
   * // -> null (if folder doesn't exist)
   */
  static findAsyncTasksDir(featureDir: string): string | null {
    const asyncTasksDir = path.join(featureDir, 'async-tasks')

    if (fs.existsSync(asyncTasksDir) && fs.statSync(asyncTasksDir).isDirectory()) {
      return './async-tasks'
    }

    return null
  }

  /**
   * Check if string is HTTP method folder name (with @ prefix)
   *
   * @param dirname - Folder name
   * @returns Whether it's HTTP method folder name
   *
   * @example
   * isHttpMethod('@get')  // -> true
   * isHttpMethod('@post') // -> true
   * isHttpMethod('get')   // -> false (no @ prefix)
   * isHttpMethod('steps') // -> false
   */
  static isHttpMethod(dirname: string): boolean {
    if (!dirname.startsWith('@')) {
      return false
    }

    const methodName = dirname.substring(1).toLowerCase()
    return Object.keys(METHOD_MAP).includes(methodName)
  }

  /**
   * Find features base directory
   *
   * @param startPath - Start path
   * @returns features directory path
   * @throws {Error} If features directory cannot be found
   *
   * @performance
   * - First call: File system traversal (slow)
   * - Repeated calls: Cache lookup (very fast, 30% server startup time reduction)
   */
  static findFeaturesBaseDir(startPath: string): string {
    // Check cache
    const cached = this.featuresBaseDirCache.get(startPath)
    if (cached !== undefined) {
      return cached
    }

    // File system traversal
    let currentPath = startPath

    while (currentPath !== path.parse(currentPath).root) {
      const dirName = path.basename(currentPath)

      if (dirName === 'features') {
        // Save to cache
        this.featuresBaseDirCache.set(startPath, currentPath)
        return currentPath
      }

      currentPath = path.dirname(currentPath)
    }

    throw new Error(`Could not find 'features' directory from: ${startPath}`)
  }

  /**
   * Clear cache (for testing)
   *
   * Deletes all Features base directory cache.
   * Mainly used in test environments.
   */
  static clearCache(): void {
    this.featuresBaseDirCache.clear()
  }

  /**
   * Return cache size (for testing/debugging)
   *
   * @returns Number of items stored in cache
   */
  static getCacheSize(): number {
    return this.featuresBaseDirCache.size
  }

  /**
   * Get caller's file path
   *
   * Supports both CommonJS and ESM:
   * - CJS: Uses V8 stack trace API
   * - ESM: Handles different stack structure
   *
   * @returns Caller's absolute path
   */
  static getCallerPath(): string {
    const originalPrepareStackTrace = Error.prepareStackTrace

    try {
      const err = new Error()
      let callerFile = ''

      Error.prepareStackTrace = (_, stack) => stack

      const stack = err.stack as unknown as NodeJS.CallSite[]

      // Find the first user file (not node:internal, not numflow internals)
      // ESM and CJS have different stack structures, so we iterate to find the caller
      for (let i = 0; i < stack.length; i++) {
        const fileName = stack[i].getFileName()

        if (!fileName) continue

        // Skip node internal modules
        if (fileName.startsWith('node:')) continue

        // Skip this file (convention.ts/convention.js)
        if (fileName.includes('/convention.')) continue

        // Skip framework internal files (dist/cjs/, dist/esm/)
        // This ensures we get the actual user's feature file, not the compiled framework code
        if (fileName.includes('/dist/cjs/') || fileName.includes('/dist/esm/')) {
          continue
        }

        // Found the actual user file!
        callerFile = fileName
        break
      }

      return callerFile
    } finally {
      Error.prepareStackTrace = originalPrepareStackTrace
    }
  }

  /**
   * Infer features base directory from feature directory
   *
   * Walks up the directory tree to find the @{method} folder,
   * then returns its parent directory as the features base.
   *
   * @param featureDir - Feature directory path
   * @returns Inferred features base directory
   *
   * @example
   * inferFeaturesBase('/path/to/test.xml/@get')
   * // -> '/path/to'
   *
   * inferFeaturesBase('/path/to/api/users/@post')
   * // -> '/path/to/api/users'
   */
  static inferFeaturesBase(featureDir: string): string {
    let currentPath = featureDir

    // Walk up to find @{method} folder
    while (currentPath !== path.parse(currentPath).root) {
      const dirName = path.basename(currentPath)

      if (this.isHttpMethod(dirName)) {
        // Found @{method} folder, return its parent
        return path.dirname(currentPath)
      }

      currentPath = path.dirname(currentPath)
    }

    // Fallback: If no @{method} folder found, return parent of featureDir
    return path.dirname(featureDir)
  }

  /**
   * Infer complete Feature configuration
   *
   * @param callerPath - Caller file path (index.js or directory path)
   * @param featuresBase - Features base directory (optional, will auto-detect if not provided)
   * @returns Inferred configuration
   *
   * @example
   * // When called from /features/api/v1/orders/@post/index.js:
   * resolveConventions('/features/api/v1/orders/@post/index')
   * // -> {
   * //   method: 'POST',
   * //   path: '/api/v1/orders',
   * //   steps: './steps',
   * //   asyncTasks: './async-tasks'
   * // }
   *
   * // When called with directory path (implicit Feature):
   * resolveConventions('/features/todos/@get')
   * // -> {
   * //   method: 'GET',
   * //   path: '/todos',
   * //   steps: './steps',
   * //   asyncTasks: null
   * // }
   *
   * // When called with custom features base directory:
   * resolveConventions('/my-api/users/@get/index', '/my-api')
   * // -> {
   * //   method: 'GET',
   * //   path: '/users',
   * //   steps: './steps',
   * //   asyncTasks: null
   * // }
   */
  static resolveConventions(callerPath: string, featuresBase?: string): {
    method: HttpMethod
    path: string
    steps: string | null
    asyncTasks: string | null
  } {
    const featureDir = path.dirname(callerPath)

    let base: string
    if (featuresBase) {
      base = featuresBase
    } else {
      try {
        base = this.findFeaturesBaseDir(featureDir)
      } catch (error) {
        // Fallback: Use inferFeaturesBase to find @{method} folder's parent
        // This allows feature() to work even outside 'features' directory
        base = this.inferFeaturesBase(featureDir)
      }
    }

    return {
      method: this.inferMethod(featureDir),
      path: this.inferPath(featureDir, base),
      steps: this.findStepsDir(featureDir),
      asyncTasks: this.findAsyncTasksDir(featureDir),
    }
  }
}
