/**
 * Fix ESM imports by adding .js extension to relative imports
 *
 * TypeScript doesn't add .js extensions to relative imports in ESM output.
 * This script adds them to ensure proper module resolution.
 */

const fs = require('fs')
const path = require('path')

const ESM_DIR = path.join(__dirname, '..', 'dist', 'esm')

/**
 * Recursively get all .js files in a directory
 */
function getJsFiles(dir) {
  const files = []

  if (!fs.existsSync(dir)) {
    return files
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      files.push(...getJsFiles(fullPath))
    } else if (entry.name.endsWith('.js')) {
      files.push(fullPath)
    }
  }

  return files
}

/**
 * Fix imports in a single file
 */
function fixImportsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8')
  let modified = false

  // Match import/export statements with relative paths that don't have .js extension
  // Examples:
  //   import { foo } from './bar'
  //   import foo from '../baz'
  //   export { foo } from './bar'
  //   export * from './bar'

  const importExportRegex = /(from\s+['"])(\.[^'"]+)(?<!\.js)(['"])/g

  content = content.replace(importExportRegex, (match, prefix, importPath, suffix) => {
    // Skip if already has .js extension
    if (importPath.endsWith('.js')) {
      return match
    }

    // Skip if it's importing a directory (has index.js)
    const absolutePath = path.resolve(path.dirname(filePath), importPath)
    if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isDirectory()) {
      // Check for index.js
      if (fs.existsSync(path.join(absolutePath, 'index.js'))) {
        modified = true
        return `${prefix}${importPath}/index.js${suffix}`
      }
    }

    // Add .js extension
    modified = true
    return `${prefix}${importPath}.js${suffix}`
  })

  // Also fix dynamic imports
  // Example: import('./foo')
  const dynamicImportRegex = /(import\s*\(\s*['"])(\.[^'"]+)(?<!\.js)(['"]\s*\))/g

  content = content.replace(dynamicImportRegex, (match, prefix, importPath, suffix) => {
    if (importPath.endsWith('.js')) {
      return match
    }
    modified = true
    return `${prefix}${importPath}.js${suffix}`
  })

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8')
  }

  return modified
}

/**
 * Main function
 */
function main() {
  console.log(`Fixing ESM imports in ${ESM_DIR}`)

  const files = getJsFiles(ESM_DIR)

  if (files.length === 0) {
    console.log('No .js files found in ESM directory')
    return
  }

  let fixedCount = 0

  for (const file of files) {
    if (fixImportsInFile(file)) {
      fixedCount++
    }
  }

  console.log(`ESM imports fixed successfully`)
  if (fixedCount > 0) {
    console.log(`  Modified ${fixedCount} file(s)`)
  }
}

main()
