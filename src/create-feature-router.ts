/**
 * createFeatureRouter
 *
 * Scans Features directory and returns Express Router.
 */

import { Router } from 'express'
import { FeatureScanner } from './feature/feature-scanner'
import type { ScannedFeature } from './feature/feature-scanner'
import type { RouterOptions } from 'express'

export interface CreateFeatureRouterOptions {
  /**
   * Index file patterns (default: ['index.js', 'index.ts', 'index.mjs', 'index.mts'])
   */
  indexPatterns?: string[]

  /**
   * Directory patterns to exclude (default: ['node_modules', '.git', 'dist', 'build'])
   */
  excludeDirs?: string[]

  /**
   * Enable debug logging (default: false)
   */
  debug?: boolean

  /**
   * Express Router options
   */
  routerOptions?: RouterOptions
}

/**
 * Scan Features directory and return Express Router
 *
 * @param featuresDir - Features directory path
 * @param options - Options
 * @returns Express Router instance
 *
 * @example
 * ```javascript
 * const express = require('express')
 * const { createFeatureRouter } = require('express-numflow')
 *
 * const app = express()
 *
 * // Create Feature Router
 * const featureRouter = await createFeatureRouter('./features')
 * app.use(featureRouter)
 *
 * app.listen(3000)
 * ```
 *
 * @example
 * ```javascript
 * // Use with options
 * const router = await createFeatureRouter('./features', {
 *   debug: true,
 *   excludeDirs: ['node_modules', 'test', 'temp'],
 * })
 * ```
 *
 * @example
 * ```javascript
 * // Mount on different paths
 * const apiRouter = await createFeatureRouter('./features/api')
 * const adminRouter = await createFeatureRouter('./features/admin')
 *
 * app.use('/api', apiRouter)
 * app.use('/admin', adminRouter)
 * ```
 */
export async function createFeatureRouter(
  featuresDir: string,
  options: CreateFeatureRouterOptions = {}
): Promise<Router> {
  const {
    indexPatterns = ['index.js', 'index.ts', 'index.mjs', 'index.mts'],
    excludeDirs = ['node_modules', '.git', 'dist', 'build'],
    debug = false,
    routerOptions = {},
  } = options

  // Create Express Router
  const router = Router(routerOptions)

  // Scan Features with FeatureScanner
  const scanner = new FeatureScanner({
    directory: featuresDir,
    indexPatterns,
    excludeDirs,
    debug,
  })

  if (debug) {
    console.log(`[express-numflow] Scanning features directory: ${featuresDir}`)
  }

  let scannedFeatures: ScannedFeature[]

  try {
    scannedFeatures = await scanner.scan()
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      throw new Error(`Features directory not found: ${featuresDir}`)
    }
    throw error
  }

  if (debug) {
    console.log(`[express-numflow] Found ${scannedFeatures.length} features`)
  }

  // Register each Feature to Router
  for (const { feature, relativePath } of scannedFeatures) {
    const info = feature.getInfo()
    const handler = feature.getHandler()

    // Initialize Feature
    await feature.initialize()

    // Register to Express Router
    const method = info.method?.toLowerCase() as
      | 'get'
      | 'post'
      | 'put'
      | 'delete'
      | 'patch'
      | 'options'
      | 'head'
      | 'all'

    if (!method) {
      console.warn(
        `[express-numflow] Feature ${relativePath} has no method, skipping`
      )
      continue
    }

    if (!info.path) {
      console.warn(
        `[express-numflow] Feature ${relativePath} has no path, skipping`
      )
      continue
    }

    // Register to Router
    router[method](info.path, handler)

    if (debug) {
      console.log(
        `[express-numflow] Registered: ${method.toUpperCase()} ${info.path} (${relativePath})`
      )
    }
  }

  return router
}
