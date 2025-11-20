/**
 * Auto-Discovery Engine
 *
 * Automatically discovers and sorts Step files and Async Task files.
 *
 * Key features:
 * 1. File scanning: Scans all .js files in specified directory
 * 2. Pattern validation: Validates if filename matches pattern (/^\d+-.*\.js$/)
 * 3. Number extraction: Extracts number part from filename
 * 4. Size-based sorting: Sorts in ascending order by number (100 < 200 < 300)
 * 5. Duplicate validation: Checks for duplicate numbers
 */

import * as fs from 'fs'
import * as path from 'path'
import { StepInfo, AsyncTaskInfo, AutoDiscoveryOptions, StepFunction, AsyncTaskFunction } from './types'

/**
 * Auto-Discovery Engine class
 */
export class AutoDiscovery {
  private readonly options: AutoDiscoveryOptions

  constructor(options: AutoDiscoveryOptions) {
    this.options = options
  }

  /**
   * Discover and sort Step files
   *
   * @returns Sorted Step list
   * @throws {Error} When directory does not exist or duplicate numbers found
   */
  async discoverSteps(): Promise<StepInfo[]> {
    const { directory, pattern, allowDuplicates } = this.options

    // 1. Check directory existence
    if (!fs.existsSync(directory)) {
      throw new Error(`Steps directory not found: ${directory}`)
    }

    // 2. Scan files
    const files = fs.readdirSync(directory)

    // 3. Pattern validation (.js, .ts, .mjs, or .mts files only)
    const validFiles = files.filter(file => {
      // Check .js, .ts, .mjs, or .mts extension
      if (!/\.(js|ts|mjs|mts)$/.test(file)) {
        return false
      }

      // Pattern validation (number-description format)
      return pattern.test(file)
    })

    if (validFiles.length === 0) {
      throw new Error(`No valid step files found in: ${directory}`)
    }

    // 4. Create StepInfo objects and extract numbers
    const steps: StepInfo[] = validFiles.map(file => {
      const match = file.match(/^(\d+)-/)
      if (!match) {
        throw new Error(`Invalid step file format: ${file}`)
      }

      const number = parseInt(match[1], 10)
      const filePath = path.join(directory, file)

      return {
        number,
        name: file,
        path: filePath,
        fn: async () => {}, // Placeholder, loaded in step 7
      }
    })

    // 5. Validate no duplicates
    if (!allowDuplicates) {
      this.validateNoDuplicates(steps)
    }

    // 6. Size-based sorting
    const sorted = steps.sort((a, b) => a.number - b.number)

    // 7. Load actual functions
    for (const step of sorted) {
      step.fn = await this.loadStepFunction(step.path)
    }

    return sorted
  }

  /**
   * Discover Async Task files
   *
   * @returns Async Task list
   */
  async discoverAsyncTasks(): Promise<AsyncTaskInfo[]> {
    const { directory } = this.options

    // 1. Check directory existence
    if (!fs.existsSync(directory)) {
      // Async tasks are optional, return empty array
      return []
    }

    // 2. Scan files
    const files = fs.readdirSync(directory)

    // 3. Filter .js, .ts, .mjs, or .mts files only (ESM support)
    const validFiles = files.filter(file => /\.(js|ts|mjs|mts)$/.test(file))

    if (validFiles.length === 0) {
      return []
    }

    // 4. Create AsyncTaskInfo objects
    const tasks: AsyncTaskInfo[] = []

    for (const file of validFiles) {
      const filePath = path.join(directory, file)
      const name = file.replace(/\.(js|ts)$/, '')

      try {
        const fn = await this.loadAsyncTaskFunction(filePath)

        tasks.push({
          name,
          path: filePath,
          fn,
        })
      } catch (error) {
        throw new Error(
          `Failed to load async task from ${file}: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }

    return tasks
  }

  /**
   * Validate no duplicates
   *
   * @param steps - Step list
   * @throws {Error} When duplicate numbers found
   */
  private validateNoDuplicates(steps: StepInfo[]): void {
    const numflow = new Set<number>()

    for (const step of steps) {
      if (numflow.has(step.number)) {
        throw new Error(
          `Duplicate step number found: ${step.number}\n` +
          `Please ensure each step has a unique number.\n` +
          `Example: 100-validate.js, 200-process.js, 300-complete.js`
        )
      }
      numflow.add(step.number)
    }
  }

  /**
   * Load Step function
   *
   * @param filePath - File path
   * @returns Step function
   */
  private async loadStepFunction(filePath: string): Promise<StepFunction> {
    try {
      // Use dynamic import for both CommonJS and ESM support
      // For .mjs and .mts files, use Function constructor to force true dynamic import
      // This prevents TypeScript from converting import() to require() in CommonJS build
      const isESM = filePath.endsWith('.mjs') || filePath.endsWith('.mts')
      const module = isESM
        ? await (new Function('p', 'return import(p)'))(filePath)
        : await import(filePath)

      // Check default export (ESM) or module.exports (CommonJS)
      const fn = module.default || module

      if (typeof fn !== 'function') {
        throw new Error(`Step file must export a function: ${filePath}`)
      }

      return fn
    } catch (error) {
      throw new Error(
        `Failed to load step from ${filePath}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Load Async Task function
   *
   * @param filePath - File path
   * @returns Async Task function
   */
  private async loadAsyncTaskFunction(filePath: string): Promise<AsyncTaskFunction> {
    try {
      // Use dynamic import for both CommonJS and ESM support
      // For .mjs and .mts files, use Function constructor to force true dynamic import
      // This prevents TypeScript from converting import() to require() in CommonJS build
      const isESM = filePath.endsWith('.mjs') || filePath.endsWith('.mts')
      const module = isESM
        ? await (new Function('p', 'return import(p)'))(filePath)
        : await import(filePath)

      // Check default export (ESM) or module.exports (CommonJS)
      const fn = module.default || module

      if (typeof fn !== 'function') {
        throw new Error(`Async task file must export a function: ${filePath}`)
      }

      return fn
    } catch (error) {
      throw new Error(
        `Failed to load async task from ${filePath}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }
}

/**
 * Discover and sort Steps (helper function)
 *
 * @param directory - Steps directory path
 * @param pattern - Filename pattern (default: /^\d+-.*\.(js|ts)$/)
 * @param allowDuplicates - Allow duplicate numbers (default: false)
 * @returns Sorted Step list
 */
export async function discoverSteps(
  directory: string,
  pattern: RegExp = /^\d+-.*\.(js|ts)$/,
  allowDuplicates: boolean = false
): Promise<StepInfo[]> {
  const discovery = new AutoDiscovery({
    directory,
    pattern,
    allowDuplicates,
  })

  return discovery.discoverSteps()
}

/**
 * Discover Async Tasks (helper function)
 *
 * @param directory - Async tasks directory path
 * @returns Async Task list
 */
export async function discoverAsyncTasks(directory: string): Promise<AsyncTaskInfo[]> {
  const discovery = new AutoDiscovery({
    directory,
    pattern: /.*\.(js|ts)$/,
    allowDuplicates: true,
  })

  return discovery.discoverAsyncTasks()
}
