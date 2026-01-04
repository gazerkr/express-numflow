/**
 * WebSocket Feature Scanner
 *
 * Scans WebSocket features directory to auto-discover Features
 *
 * Folder structure:
 * ws/
 * └── chat/
 *     ├── @connect/
 *     │   └── steps/
 *     │       └── 100-authenticate.js
 *     ├── @disconnect/
 *     │   └── steps/
 *     │       └── 100-cleanup.js
 *     └── send/
 *         └── @message/
 *             ├── steps/
 *             │   └── 100-broadcast.js
 *             └── async-tasks/
 *                 └── notify.js
 */

import * as fs from 'fs'
import * as path from 'path'
import type { ScannedWsFeature, WsStepInfo, WsFeatureConfig } from './types'
import type { AsyncTaskInfo } from '../core/types'
import { WsConventionResolver } from './convention'

/**
 * Scanner options
 */
export interface WsScanOptions {
  /**
   * WebSocket features directory path
   */
  directory: string

  /**
   * Index file patterns
   * @default ['index', 'index.ts', 'index.mjs', 'index.mts']
   */
  indexPatterns?: string[]

  /**
   * Directories to exclude
   * @default ['node_modules', '.git', 'dist', 'build']
   */
  excludeDirs?: string[]

  /**
   * Debug logging
   * @default false
   */
  debug?: boolean
}

/**
 * WebSocket Feature Scanner class
 */
export class WsFeatureScanner {
  private options: Required<WsScanOptions>
  private baseDir: string | null = null

  constructor(options: WsScanOptions) {
    this.options = {
      directory: options.directory,
      indexPatterns: options.indexPatterns || ['index', 'index.ts', 'index.mjs', 'index.mts'],
      excludeDirs: options.excludeDirs || ['node_modules', '.git', 'dist', 'build'],
      debug: options.debug || false,
    }
  }

  /**
   * Scan WebSocket features
   */
  async scan(): Promise<ScannedWsFeature[]> {
    const features: ScannedWsFeature[] = []
    this.baseDir = path.resolve(process.cwd(), this.options.directory)

    if (!fs.existsSync(this.baseDir)) {
      throw new Error(`WebSocket features directory not found: ${this.baseDir}`)
    }

    this.log(`Scanning WebSocket features directory: ${this.baseDir}`)

    await this.scanDirectory(this.baseDir, features)

    this.log(`Found ${features.length} WebSocket features`)

    return features
  }

  /**
   * Recursive directory scan
   */
  private async scanDirectory(dir: string, features: ScannedWsFeature[]): Promise<void> {
    const entries = fs.readdirSync(dir, { withFileTypes: true })

    // Check if WebSocket event folder (@connect, @disconnect, @message)
    const dirName = path.basename(dir)
    if (WsConventionResolver.isWsEventFolder(dirName)) {
      const feature = await this.createFeature(dir)
      if (feature) {
        features.push(feature)
        this.log(`Found feature: ${feature.event} (${feature.eventType})`)
      }
      return // Do not scan inside event folder
    }

    // Scan subdirectories
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue
      }

      // Check excluded directories
      if (this.options.excludeDirs.includes(entry.name)) {
        this.log(`Skipping excluded directory: ${entry.name}`)
        continue
      }

      // Recursive scan
      const fullPath = path.join(dir, entry.name)
      await this.scanDirectory(fullPath, features)
    }
  }

  /**
   * Create Feature
   */
  private async createFeature(featureDir: string): Promise<ScannedWsFeature | null> {
    try {
      const conventions = WsConventionResolver.resolveConventions(featureDir, this.baseDir!)

      // Load Steps
      const steps = conventions.steps
        ? await this.loadSteps(path.join(featureDir, conventions.steps))
        : []

      // Load Async Tasks
      const asyncTasks = conventions.asyncTasks
        ? await this.loadAsyncTasks(path.join(featureDir, conventions.asyncTasks))
        : []

      // Load config if index.js exists
      const config = await this.loadConfig(featureDir)

      return {
        event: conventions.eventName,
        eventType: conventions.eventType,
        steps,
        asyncTasks,
        config,
        dirPath: featureDir,
      }
    } catch (error) {
      console.error(`Failed to create feature from ${featureDir}:`, error)
      return null
    }
  }

  /**
   * Load Steps
   */
  private async loadSteps(stepsDir: string): Promise<WsStepInfo[]> {
    if (!fs.existsSync(stepsDir)) {
      return []
    }

    const entries = fs.readdirSync(stepsDir, { withFileTypes: true })
    const steps: WsStepInfo[] = []

    // Pattern to extract number from filename: 100-name.js
    const stepPattern = /^(\d+)-(.+)\.(js|ts|mjs|mts)$/

    for (const entry of entries) {
      if (entry.isDirectory()) {
        continue
      }

      const match = entry.name.match(stepPattern)
      if (!match) {
        continue
      }

      const [, numberStr] = match
      const number = parseInt(numberStr, 10)
      const filePath = path.join(stepsDir, entry.name)

      try {
        const module = await import(filePath)
        const fn = module.default || module

        if (typeof fn !== 'function') {
          this.log(`Step ${entry.name} does not export a function, skipping`)
          continue
        }

        steps.push({
          number,
          name: entry.name,
          fn,
          path: filePath,
        })
      } catch (error) {
        console.error(`Failed to load step ${filePath}:`, error)
      }
    }

    // Sort by number
    steps.sort((a, b) => a.number - b.number)

    return steps
  }

  /**
   * Load Async Tasks
   */
  private async loadAsyncTasks(tasksDir: string): Promise<AsyncTaskInfo[]> {
    if (!fs.existsSync(tasksDir)) {
      return []
    }

    const entries = fs.readdirSync(tasksDir, { withFileTypes: true })
    const tasks: AsyncTaskInfo[] = []

    for (const entry of entries) {
      if (entry.isDirectory()) {
        continue
      }

      // Only .js, .ts, .mjs, .mts files
      if (!/\.(js|ts|mjs|mts)$/.test(entry.name)) {
        continue
      }

      const filePath = path.join(tasksDir, entry.name)

      try {
        const module = await import(filePath)
        const fn = module.default || module

        if (typeof fn !== 'function') {
          this.log(`Async task ${entry.name} does not export a function, skipping`)
          continue
        }

        tasks.push({
          name: entry.name.replace(/\.(js|ts|mjs|mts)$/, ''),
          fn,
          path: filePath,
        })
      } catch (error) {
        console.error(`Failed to load async task ${filePath}:`, error)
      }
    }

    return tasks
  }

  /**
   * Load Feature configuration (index.js)
   */
  private async loadConfig(featureDir: string): Promise<Partial<WsFeatureConfig> | undefined> {
    for (const pattern of this.options.indexPatterns) {
      const indexPath = path.join(featureDir, pattern)

      if (fs.existsSync(indexPath) || fs.existsSync(indexPath + '.js') || fs.existsSync(indexPath + '.ts')) {
        try {
          const actualPath = fs.existsSync(indexPath) ? indexPath :
            fs.existsSync(indexPath + '.js') ? indexPath + '.js' : indexPath + '.ts'

          const module = await import(actualPath)
          const config = module.default || module

          if (typeof config === 'object') {
            return config as Partial<WsFeatureConfig>
          }
        } catch (error) {
          // Failed to load index file (ignore)
        }
      }
    }

    return undefined
  }

  /**
   * Debug log
   */
  private log(message: string): void {
    if (this.options.debug) {
      console.log(`[WsFeatureScanner] ${message}`)
    }
  }
}

/**
 * WebSocket features scan helper function
 */
export async function scanWsFeatures(
  directory: string,
  options?: Partial<WsScanOptions>
): Promise<ScannedWsFeature[]> {
  const scanner = new WsFeatureScanner({
    directory,
    ...options,
  })

  return scanner.scan()
}
