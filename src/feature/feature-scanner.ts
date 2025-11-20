/**
 * Feature Scanner
 *
 * Recursively scans Features directory to automatically discover all Features.
 * Supports Convention over Configuration to automatically infer method/path from folder structure.
 */

import * as fs from 'fs'
import * as path from 'path'
import { Feature } from './feature'
import { ConventionResolver } from './convention'

export interface ScanOptions {
  /**
   * Features directory path
   */
  directory: string

  /**
   * index file patterns (default: ['index', 'index.ts'])
   */
  indexPatterns?: string[]

  /**
   * Directory patterns to exclude
   */
  excludeDirs?: string[]

  /**
   * Enable debug logging
   */
  debug?: boolean
}

export interface ScannedFeature {
  /**
   * Feature instance
   */
  feature: Feature

  /**
   * Feature file path
   */
  filePath: string

  /**
   * Relative path (based on features directory)
   */
  relativePath: string
}

/**
 * Feature Scanner class
 */
export class FeatureScanner {
  private options: Required<ScanOptions>
  private baseDir: string | null = null

  constructor(options: ScanOptions) {
    this.options = {
      directory: options.directory,
      indexPatterns: options.indexPatterns || ['index', 'index.ts', 'index.mjs', 'index.mts'],
      excludeDirs: options.excludeDirs || ['node_modules', '.git', 'dist', 'build'],
      debug: options.debug || false,
    }
  }

  /**
   * Recursively scan Features directory
   */
  async scan(): Promise<ScannedFeature[]> {
    const features: ScannedFeature[] = []
    this.baseDir = path.resolve(process.cwd(), this.options.directory)

    if (!fs.existsSync(this.baseDir)) {
      throw new Error(`Features directory not found: ${this.baseDir}`)
    }

    this.log(`Scanning features directory: ${this.baseDir}`)

    await this.scanDirectory(this.baseDir, this.baseDir, features)

    this.log(`Found ${features.length} features`)

    // 🔧 CRITICAL FIX: Sort features by route priority
    // This ensures static routes are registered before dynamic routes
    // Example: /blog/search (static) before /blog/:slug (dynamic)
    this.sortFeaturesByPriority(features)

    return features
  }

  /**
   * Recursively scan directory
   *
   * @private
   */
  private async scanDirectory(
    dir: string,
    baseDir: string,
    features: ScannedFeature[]
  ): Promise<void> {
    const entries = fs.readdirSync(dir, { withFileTypes: true })

    // Step 1: Check if index.js exists in current directory
    const indexFile = entries.find(entry =>
      this.options.indexPatterns.includes(entry.name)
    )

    if (indexFile) {
      // Explicit Feature (index.js exists)
      try {
        const fullPath = path.join(dir, indexFile.name)
        this.log(`Found feature file: ${fullPath}`)

        const feature = await this.loadFeature(fullPath)

        if (feature) {
          const relativePath = path.relative(baseDir, fullPath)
          features.push({
            feature,
            filePath: fullPath,
            relativePath,
          })
          this.log(`Loaded explicit feature: ${relativePath}`)
        }
      } catch (error) {
        console.error(`Failed to load feature from ${path.join(dir, indexFile.name)}:`, error)
      }

      // Stop scanning subdirectories if index.js exists (already processed as Feature)
      return
    }

    // Step 2: Check for implicit Feature if no index.js
    const isImplicit = this.isImplicitFeature(dir, entries)

    if (isImplicit) {
      try {
        const feature = this.createImplicitFeature(dir)
        const relativePath = path.relative(baseDir, dir)

        features.push({
          feature,
          filePath: dir, // Directory path
          relativePath,
        })

        this.log(`Created implicit feature: ${relativePath}`)
      } catch (error) {
        console.error(`Failed to create implicit feature from ${dir}:`, error)
      }

      // Continue scanning subdirectories even for implicit Features
      // (steps/, async-tasks/ are Feature components, but other folders should be scanned)
      // ⚠️ Important: Don't return!
    }

    // Step 3: Scan subdirectories
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue
      }

      const fullPath = path.join(dir, entry.name)

      // Check excluded directories
      if (this.options.excludeDirs.includes(entry.name)) {
        this.log(`Skipping excluded directory: ${entry.name}`)
        continue
      }

      // Don't scan steps/ and async-tasks/ under @ folders (Feature directories)
      // But scan steps/ and async-tasks/ in regular directories (could be resource names)
      if (isImplicit && (entry.name === 'steps' || entry.name === 'async-tasks')) {
        continue
      }

      // Scan recursively
      await this.scanDirectory(fullPath, baseDir, features)
    }
  }

  /**
   * Load Feature file
   *
   * @private
   */
  private async loadFeature(filePath: string): Promise<Feature | null> {
    try {
      // Use dynamic import() for ESM/CommonJS compatibility
      const module = await import(filePath)

      // Support module.exports or export default
      const feature = module.default || module

      // Check if it's a Feature instance
      // Use duck typing instead of instanceof (CommonJS/ESM compatibility)
      if (
        feature &&
        typeof feature === 'object' &&
        typeof feature.getHandler === 'function' &&
        typeof feature.getInfo === 'function' &&
        typeof feature.initialize === 'function'
      ) {
        return feature as Feature
      }

      console.warn(`File ${filePath} does not export a Feature instance`)
      return null
    } catch (error) {
      throw error
    }
  }

  /**
   * Check if it's an implicit Feature
   *
   * @param dir - Directory path
   * @param entries - List of files/folders in directory
   * @returns Whether it's an implicit Feature
   *
   * @private
   */
  private isImplicitFeature(dir: string, entries: fs.Dirent[]): boolean {
    const dirName = path.basename(dir)

    // Not an HTTP method folder if doesn't start with @ prefix
    if (!dirName.startsWith('@')) {
      return false
    }

    // Check if it's an HTTP method with ConventionResolver
    if (!ConventionResolver.isHttpMethod(dirName)) {
      return false
    }

    // Recognized as implicit Feature only if has steps/ or async-tasks/ directory
    const hasSteps = entries.some(e =>
      e.isDirectory() && e.name === 'steps'
    )
    const hasAsyncTasks = entries.some(e =>
      e.isDirectory() && e.name === 'async-tasks'
    )

    return hasSteps || hasAsyncTasks
  }

  /**
   * Create implicit Feature (without index.js)
   *
   * @param dir - Feature directory path
   * @returns Feature instance
   *
   * @private
   */
  private createImplicitFeature(dir: string): Feature {
    // Infer Convention (use virtual index.js path)
    const virtualIndexPath = path.join(dir, 'index')
    const conventions = ConventionResolver.resolveConventions(virtualIndexPath, this.baseDir || undefined)

    // Create Feature with empty config (all inferred from Convention)
    return new Feature({
      method: conventions.method,
      path: conventions.path,
      steps: conventions.steps ?? undefined,
      asyncTasks: conventions.asyncTasks ?? undefined,
    }, dir)
  }

  /**
   * Sort features by route priority
   *
   * Priority rules (highest to lowest):
   * 1. Depth: Deeper routes first (/a/b/c before /a/b)
   * 2. Specificity: Static segments before dynamic (/blog/search before /blog/:slug)
   * 3. Alphabetical: For same priority, alphabetical order
   *
   * @param features - Features array to sort (in-place)
   * @private
   */
  private sortFeaturesByPriority(features: ScannedFeature[]): void {
    features.sort((a, b) => {
      const priorityA = this.calculateRoutePriority(a.feature.getInfo().path)
      const priorityB = this.calculateRoutePriority(b.feature.getInfo().path)

      if (priorityA !== priorityB) {
        return priorityB - priorityA  // Higher priority first (descending)
      }

      // Same priority: alphabetical order for consistency
      const pathA = a.feature.getInfo().path || ''
      const pathB = b.feature.getInfo().path || ''
      return pathA.localeCompare(pathB)
    })
  }

  /**
   * Calculate route priority score
   *
   * Higher score = Higher priority (should be registered first)
   *
   * Scoring:
   * - Each segment: +1000 points (depth)
   * - Each static segment: +100 points (specificity)
   *
   * Examples:
   * - /blog/search/advanced → 3000 + 300 = 3300
   * - /blog/search → 2000 + 200 = 2200
   * - /blog/:slug → 2000 + 100 = 2100
   * - / → 1000 + 100 = 1100
   *
   * @param routePath - Route path
   * @returns Priority score
   * @private
   */
  private calculateRoutePriority(routePath: string | undefined): number {
    if (!routePath) return 0

    const segments = routePath.split('/').filter(s => s.length > 0)
    let score = 0

    // 1. Depth: Each segment adds 1000 points
    score += segments.length * 1000

    // 2. Specificity: Each static (non-dynamic) segment adds 100 points
    for (const segment of segments) {
      if (!segment.startsWith(':')) {
        score += 100
      }
    }

    return score
  }

  /**
   * Debug log
   *
   * @private
   */
  private log(message: string): void {
    if (this.options.debug) {
      console.log(`[FeatureScanner] ${message}`)
    }
  }
}

/**
 * Recursively scan Features directory and return all Features
 *
 * @param directory - Features directory path
 * @param options - Scan options
 * @returns Array of ScannedFeature
 *
 * @example
 * ```javascript
 * const numflow = require('numflow')
 *
 * // Scan Features
 * const features = await numflow.scanFeatures('./features')
 *
 * // Register each Feature
 * features.forEach(({ feature }) => {
 *   app.registerFeature(feature)
 * })
 * ```
 *
 * @example
 * ```javascript
 * // Scan with options
 * const features = await numflow.scanFeatures('./features', {
 *   indexPatterns: ['index', 'feature'],
 *   excludeDirs: ['node_modules', 'test'],
 *   debug: true,
 * })
 * ```
 */
export async function scanFeatures(
  directory: string,
  options?: Partial<ScanOptions>
): Promise<ScannedFeature[]> {
  const scanner = new FeatureScanner({
    directory,
    ...options,
  })

  return scanner.scan()
}
