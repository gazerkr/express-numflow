/**
 * Package Type Resolver
 *
 * Resolves module type from package.json
 * Supports Node.js "type" field for .js file interpretation
 */

import * as fs from 'fs'
import * as path from 'path'

interface PackageJson {
  type?: 'module' | 'commonjs'
  [key: string]: any
}

// Cache for package.json lookups (performance optimization)
const packageTypeCache = new Map<string, 'module' | 'commonjs'>()

/**
 * Find nearest package.json starting from filePath
 */
function findNearestPackageJson(filePath: string): string | null {
  let currentDir = path.dirname(filePath)
  const root = path.parse(currentDir).root

  while (currentDir !== root) {
    const packageJsonPath = path.join(currentDir, 'package.json')

    if (fs.existsSync(packageJsonPath)) {
      return packageJsonPath
    }

    const parentDir = path.dirname(currentDir)
    if (parentDir === currentDir) break // Reached root
    currentDir = parentDir
  }

  return null
}

/**
 * Read package.json "type" field
 */
function readPackageType(packageJsonPath: string): 'module' | 'commonjs' {
  try {
    const content = fs.readFileSync(packageJsonPath, 'utf-8')
    const packageJson: PackageJson = JSON.parse(content)

    // Default to 'commonjs' if not specified
    return packageJson.type === 'module' ? 'module' : 'commonjs'
  } catch (error) {
    // If error reading package.json, default to commonjs
    return 'commonjs'
  }
}

/**
 * Determine if a .js file should be treated as ESM
 *
 * Logic:
 * - .mjs → always ESM
 * - .cjs → always CommonJS
 * - .mts → always ESM (TypeScript)
 * - .cts → always CommonJS (TypeScript)
 * - .js → depends on nearest package.json "type" field
 * - .ts → depends on nearest package.json "type" field (when used in runtime)
 *
 * @param filePath - Absolute file path
 * @returns 'esm' | 'commonjs'
 */
export function resolveModuleType(filePath: string): 'esm' | 'commonjs' {
  const ext = path.extname(filePath)

  // Explicit extensions (always clear)
  if (ext === '.mjs' || ext === '.mts') return 'esm'
  if (ext === '.cjs' || ext === '.cts') return 'commonjs'

  // For .js and .ts files, check package.json "type" field
  if (ext === '.js' || ext === '.ts') {
    // Check cache first
    const cacheKey = path.dirname(filePath)
    if (packageTypeCache.has(cacheKey)) {
      const type = packageTypeCache.get(cacheKey)!
      return type === 'module' ? 'esm' : 'commonjs'
    }

    // Find and read package.json
    const packageJsonPath = findNearestPackageJson(filePath)

    if (packageJsonPath) {
      const packageType = readPackageType(packageJsonPath)
      packageTypeCache.set(cacheKey, packageType)
      return packageType === 'module' ? 'esm' : 'commonjs'
    }

    // No package.json found, default to commonjs
    return 'commonjs'
  }

  // Unknown extension, default to commonjs
  return 'commonjs'
}

/**
 * Clear cache (useful for testing)
 */
export function clearPackageTypeCache(): void {
  packageTypeCache.clear()
}
