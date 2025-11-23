/**
 * Bug reproduction test: Explicit Feature with index.js has no method
 *
 * Issue: When using feature() in index.js, if the 'features' directory
 * cannot be found, Convention resolution fails silently and method becomes undefined.
 *
 * Expected: Feature should work with @get folder even with index.js
 * Actual: "Feature has no method, skipping" error
 */

import * as path from 'path'
import * as fs from 'fs'
import { ConventionResolver } from '../src/feature/convention'

describe('Bug: Explicit Feature with index.js has no method', () => {
  const testDir = path.join(process.cwd(), 'test-fixtures', 'bug-no-method')
  const featureDir = path.join(testDir, 'features', 'test.xml', '@get')
  const indexPath = path.join(featureDir, 'index.js')

  beforeAll(() => {
    // Create test directory structure
    fs.mkdirSync(featureDir, { recursive: true })

    // Create index.js with feature()
    const indexContent = `
const { feature } = require('../../../../../dist/cjs/index.js')

module.exports = feature({
  contextInitializer: (ctx, req, res) => {
    ctx.test = 'value'
  },
})
`
    fs.writeFileSync(indexPath, indexContent)

    // Create a step
    const stepsDir = path.join(featureDir, 'steps')
    fs.mkdirSync(stepsDir, { recursive: true })
    fs.writeFileSync(
      path.join(stepsDir, '100-test.js'),
      `
module.exports = async (ctx, req, res) => {
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ test: ctx.test }))
}
`
    )
  })

  afterAll(() => {
    // Cleanup
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true })
    }
    ConventionResolver.clearCache()
  })

  test('should infer method and path correctly even with index.js', async () => {
    // Load the feature dynamically
    delete require.cache[indexPath]
    const loadedFeature = require(indexPath)

    // Initialize the feature
    await loadedFeature.initialize()

    // Get feature info
    const info = loadedFeature.getInfo()

    // After fix: method and path should be inferred correctly
    // even when 'features' directory is not found
    expect(info.method).toBe('GET')
    expect(info.path).toBe('/test.xml')
    expect(info.steps).toBe(1) // Should find the step
  })
})
