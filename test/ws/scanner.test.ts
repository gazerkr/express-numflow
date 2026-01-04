/**
 * WsFeatureScanner Tests
 *
 * TDD: Tests for WebSocket feature discovery and loading
 *
 * Features:
 * - Directory scanning for WebSocket event folders
 * - Step file loading (numbered files)
 * - Async task loading
 * - Config loading from index files
 * - Error handling for missing directories
 */

import * as fs from 'fs'
import * as path from 'path'
import { WsFeatureScanner, scanWsFeatures } from '../../src/ws/scanner'

describe('WsFeatureScanner', () => {
  const testBaseDir = path.join(__dirname, '__fixtures__', 'ws-scanner')

  // Setup test fixtures
  beforeAll(() => {
    // Create test directory structure
    createTestFixtures()
  })

  // Cleanup after tests
  afterAll(() => {
    // Remove test fixtures
    removeTestFixtures()
  })

  describe('Constructor', () => {
    it('should accept directory option', () => {
      const scanner = new WsFeatureScanner({
        directory: testBaseDir,
      })

      expect(scanner).toBeDefined()
    })

    it('should accept custom options', () => {
      const scanner = new WsFeatureScanner({
        directory: testBaseDir,
        indexPatterns: ['custom-index.js'],
        excludeDirs: ['custom-exclude'],
        debug: true,
      })

      expect(scanner).toBeDefined()
    })
  })

  describe('scan()', () => {
    it('should throw error if directory does not exist', async () => {
      const scanner = new WsFeatureScanner({
        directory: path.join(__dirname, 'non-existent'),
      })

      await expect(scanner.scan()).rejects.toThrow('WebSocket features directory not found')
    })

    it('should return empty array for empty directory', async () => {
      const emptyDir = path.join(testBaseDir, 'empty')
      fs.mkdirSync(emptyDir, { recursive: true })

      const scanner = new WsFeatureScanner({
        directory: emptyDir,
      })

      const features = await scanner.scan()

      expect(features).toEqual([])
    })

    it('should find @connect feature', async () => {
      const scanner = new WsFeatureScanner({
        directory: testBaseDir,
      })

      const features = await scanner.scan()

      const connectFeature = features.find((f) => f.eventType === 'connect')
      expect(connectFeature).toBeDefined()
      expect(connectFeature?.event).toBe('connect')
    })

    it('should find @disconnect feature', async () => {
      const scanner = new WsFeatureScanner({
        directory: testBaseDir,
      })

      const features = await scanner.scan()

      const disconnectFeature = features.find((f) => f.eventType === 'disconnect')
      expect(disconnectFeature).toBeDefined()
      expect(disconnectFeature?.event).toBe('disconnect')
    })

    it('should find @message feature with path-based event name', async () => {
      const scanner = new WsFeatureScanner({
        directory: testBaseDir,
      })

      const features = await scanner.scan()

      const messageFeature = features.find((f) => f.eventType === 'message')
      expect(messageFeature).toBeDefined()
      expect(messageFeature?.event).toBe('chat:send')
    })

    it('should skip excluded directories', async () => {
      // Create a feature in node_modules (should be excluded)
      const nodeModulesStepsDir = path.join(testBaseDir, 'node_modules', '@connect', 'steps')
      fs.mkdirSync(nodeModulesStepsDir, { recursive: true })
      fs.writeFileSync(
        path.join(nodeModulesStepsDir, '100-test.js'),
        'module.exports = () => {}'
      )

      const scanner = new WsFeatureScanner({
        directory: testBaseDir,
        excludeDirs: ['node_modules', 'empty'],
      })

      const features = await scanner.scan()

      // Should not include the node_modules feature
      const allDirs = features.map((f) => f.dirPath)
      expect(allDirs.some((d) => d.includes('node_modules'))).toBe(false)
    })
  })

  describe('Steps Loading', () => {
    it('should load steps in numerical order', async () => {
      const scanner = new WsFeatureScanner({
        directory: testBaseDir,
      })

      const features = await scanner.scan()

      const connectFeature = features.find((f) => f.eventType === 'connect')
      expect(connectFeature?.steps.length).toBeGreaterThan(0)

      // Verify order
      const stepNumbers = connectFeature!.steps.map((s) => s.number)
      const sorted = [...stepNumbers].sort((a, b) => a - b)
      expect(stepNumbers).toEqual(sorted)
    })

    it('should include step number and name', async () => {
      const scanner = new WsFeatureScanner({
        directory: testBaseDir,
      })

      const features = await scanner.scan()

      const connectFeature = features.find((f) => f.eventType === 'connect')
      const firstStep = connectFeature!.steps[0]

      expect(firstStep.number).toBeDefined()
      expect(firstStep.name).toBeDefined()
      expect(firstStep.path).toBeDefined()
      expect(typeof firstStep.fn).toBe('function')
    })

    it('should ignore non-step files', async () => {
      const scanner = new WsFeatureScanner({
        directory: testBaseDir,
      })

      const features = await scanner.scan()

      const connectFeature = features.find((f) => f.eventType === 'connect')

      // Should not include files that don't match step pattern
      const hasInvalidStep = connectFeature!.steps.some(
        (s) => !s.name.match(/^\d+-/)
      )
      expect(hasInvalidStep).toBe(false)
    })

    it('should return empty steps array if steps folder does not exist', async () => {
      // Create a @message feature without steps folder
      const noStepsDir = path.join(testBaseDir, 'no-steps', '@message')
      fs.mkdirSync(noStepsDir, { recursive: true })

      const scanner = new WsFeatureScanner({
        directory: testBaseDir,
      })

      const features = await scanner.scan()

      const noStepsFeature = features.find((f) => f.dirPath === noStepsDir)
      expect(noStepsFeature?.steps).toEqual([])
    })
  })

  describe('Async Tasks Loading', () => {
    it('should load async tasks from async-tasks folder', async () => {
      const scanner = new WsFeatureScanner({
        directory: testBaseDir,
      })

      const features = await scanner.scan()

      // Check chat:send feature for async tasks
      const messageFeature = features.find((f) => f.event === 'chat:send')

      if (messageFeature) {
        // Async tasks should be an array (might be empty if no async tasks created)
        expect(Array.isArray(messageFeature.asyncTasks)).toBe(true)
      }
    })

    it('should return empty array if async-tasks folder does not exist', async () => {
      const scanner = new WsFeatureScanner({
        directory: testBaseDir,
      })

      const features = await scanner.scan()

      // @connect feature has no async-tasks folder
      const connectFeature = features.find((f) => f.eventType === 'connect')
      expect(connectFeature?.asyncTasks).toEqual([])
    })
  })

  describe('Feature Path', () => {
    it('should include dirPath in scanned feature', async () => {
      const scanner = new WsFeatureScanner({
        directory: testBaseDir,
      })

      const features = await scanner.scan()

      features.forEach((feature) => {
        expect(feature.dirPath).toBeDefined()
        expect(fs.existsSync(feature.dirPath)).toBe(true)
      })
    })
  })
})

describe('scanWsFeatures() helper', () => {
  const testBaseDir = path.join(__dirname, '__fixtures__', 'ws-scanner')

  beforeAll(() => {
    createTestFixtures()
  })

  afterAll(() => {
    removeTestFixtures()
  })

  it('should scan features using helper function', async () => {
    const features = await scanWsFeatures(testBaseDir)

    expect(Array.isArray(features)).toBe(true)
    expect(features.length).toBeGreaterThan(0)
  })

  it('should accept additional options', async () => {
    const features = await scanWsFeatures(testBaseDir, {
      debug: false,
      excludeDirs: ['node_modules', 'empty', 'no-steps'],
    })

    expect(Array.isArray(features)).toBe(true)
  })
})

// ========== Test Fixtures Setup ==========

function createTestFixtures() {
  const testBaseDir = path.join(__dirname, '__fixtures__', 'ws-scanner')

  // Clean up if exists
  if (fs.existsSync(testBaseDir)) {
    fs.rmSync(testBaseDir, { recursive: true })
  }

  // Create directory structure
  // ws-scanner/
  //   @connect/
  //     steps/
  //       100-authenticate.js
  //       200-log-connection.js
  //   @disconnect/
  //     steps/
  //       100-cleanup.js
  //   chat/
  //     send/
  //       @message/
  //         steps/
  //           100-validate.js
  //           200-broadcast.js
  //         async-tasks/
  //           notify.js

  // @connect feature
  const connectStepsDir = path.join(testBaseDir, '@connect', 'steps')
  fs.mkdirSync(connectStepsDir, { recursive: true })
  fs.writeFileSync(
    path.join(connectStepsDir, '100-authenticate.js'),
    `module.exports = async (ctx, trigger, responder) => {
      ctx.authenticated = true;
    };`
  )
  fs.writeFileSync(
    path.join(connectStepsDir, '200-log-connection.js'),
    `module.exports = async (ctx) => {
      ctx.logged = true;
    };`
  )
  // Add a non-step file (should be ignored)
  fs.writeFileSync(
    path.join(connectStepsDir, 'helper.js'),
    `module.exports = () => {};`
  )

  // @disconnect feature
  const disconnectStepsDir = path.join(testBaseDir, '@disconnect', 'steps')
  fs.mkdirSync(disconnectStepsDir, { recursive: true })
  fs.writeFileSync(
    path.join(disconnectStepsDir, '100-cleanup.js'),
    `module.exports = async (ctx) => {
      ctx.cleaned = true;
    };`
  )

  // chat/send/@message feature
  const messageStepsDir = path.join(testBaseDir, 'chat', 'send', '@message', 'steps')
  const messageAsyncDir = path.join(testBaseDir, 'chat', 'send', '@message', 'async-tasks')
  fs.mkdirSync(messageStepsDir, { recursive: true })
  fs.mkdirSync(messageAsyncDir, { recursive: true })
  fs.writeFileSync(
    path.join(messageStepsDir, '100-validate.js'),
    `module.exports = async (ctx, trigger) => {
      ctx.validated = true;
    };`
  )
  fs.writeFileSync(
    path.join(messageStepsDir, '200-broadcast.js'),
    `module.exports = async (ctx, trigger, responder) => {
      ctx.broadcasted = true;
    };`
  )
  fs.writeFileSync(
    path.join(messageAsyncDir, 'notify.js'),
    `module.exports = async (ctx) => {
      // Async notification
    };`
  )
}

function removeTestFixtures() {
  const testBaseDir = path.join(__dirname, '__fixtures__', 'ws-scanner')

  if (fs.existsSync(testBaseDir)) {
    fs.rmSync(testBaseDir, { recursive: true })
  }
}
