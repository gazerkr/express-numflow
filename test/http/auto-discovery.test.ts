/**
 * AutoDiscovery Tests
 */

import * as fs from 'fs'
import * as path from 'path'
import { AutoDiscovery } from '../../src/http/auto-discovery'

const fixturesDir = path.join(__dirname, '__fixtures__', 'auto-discovery-test')

describe('AutoDiscovery', () => {
  beforeAll(() => {
    fs.mkdirSync(fixturesDir, { recursive: true })
  })

  afterAll(() => {
    if (fs.existsSync(fixturesDir)) {
      fs.rmSync(fixturesDir, { recursive: true })
    }
  })

  describe('discoverSteps', () => {
    it('should throw error when directory does not exist', async () => {
      const discovery = new AutoDiscovery({
        directory: '/non/existent/path',
        pattern: /^\d+-.*\.(js|ts)$/,
        allowDuplicates: false,
      })

      await expect(discovery.discoverSteps()).rejects.toThrow('Steps directory not found')
    })

    it('should throw error when no valid step files found', async () => {
      const emptyDir = path.join(fixturesDir, 'empty-steps')
      fs.mkdirSync(emptyDir, { recursive: true })

      const discovery = new AutoDiscovery({
        directory: emptyDir,
        pattern: /^\d+-.*\.(js|ts)$/,
        allowDuplicates: false,
      })

      await expect(discovery.discoverSteps()).rejects.toThrow('No valid step files found')

      fs.rmSync(emptyDir, { recursive: true })
    })

    it('should filter out non-js/ts files', async () => {
      const stepsDir = path.join(fixturesDir, 'mixed-files')
      fs.mkdirSync(stepsDir, { recursive: true })
      
      // Create invalid file
      fs.writeFileSync(path.join(stepsDir, 'readme.txt'), 'text file')
      fs.writeFileSync(path.join(stepsDir, '100-step.js'), 'module.exports = () => {}')

      const discovery = new AutoDiscovery({
        directory: stepsDir,
        pattern: /^\d+-.*\.(js|ts)$/,
        allowDuplicates: false,
      })

      const steps = await discovery.discoverSteps()
      expect(steps.length).toBe(1)
      expect(steps[0].name).toBe('100-step.js')

      fs.rmSync(stepsDir, { recursive: true })
    })

    it('should discover and sort step files', async () => {
      const stepsDir = path.join(fixturesDir, 'valid-steps')
      fs.mkdirSync(stepsDir, { recursive: true })

      fs.writeFileSync(path.join(stepsDir, '300-third.js'), 'module.exports = () => {}')
      fs.writeFileSync(path.join(stepsDir, '100-first.js'), 'module.exports = () => {}')
      fs.writeFileSync(path.join(stepsDir, '200-second.js'), 'module.exports = () => {}')

      const discovery = new AutoDiscovery({
        directory: stepsDir,
        pattern: /^\d+-.*\.(js|ts)$/,
        allowDuplicates: false,
      })

      const steps = await discovery.discoverSteps()

      expect(steps.length).toBe(3)
      expect(steps[0].number).toBe(100)
      expect(steps[1].number).toBe(200)
      expect(steps[2].number).toBe(300)

      fs.rmSync(stepsDir, { recursive: true })
    })

    it('should throw error on duplicate step numbers', async () => {
      const stepsDir = path.join(fixturesDir, 'duplicate-steps')
      fs.mkdirSync(stepsDir, { recursive: true })

      fs.writeFileSync(path.join(stepsDir, '100-first.js'), 'module.exports = () => {}')
      fs.writeFileSync(path.join(stepsDir, '100-duplicate.js'), 'module.exports = () => {}')

      const discovery = new AutoDiscovery({
        directory: stepsDir,
        pattern: /^\d+-.*\.(js|ts)$/,
        allowDuplicates: false,
      })

      await expect(discovery.discoverSteps()).rejects.toThrow('Duplicate step number')

      fs.rmSync(stepsDir, { recursive: true })
    })

    it('should allow duplicates when allowDuplicates is true', async () => {
      const stepsDir = path.join(fixturesDir, 'allow-dup-steps')
      fs.mkdirSync(stepsDir, { recursive: true })

      fs.writeFileSync(path.join(stepsDir, '100-first.js'), 'module.exports = () => {}')
      fs.writeFileSync(path.join(stepsDir, '100-duplicate.js'), 'module.exports = () => {}')

      const discovery = new AutoDiscovery({
        directory: stepsDir,
        pattern: /^\d+-.*\.(js|ts)$/,
        allowDuplicates: true,
      })

      const steps = await discovery.discoverSteps()
      expect(steps.length).toBe(2)

      fs.rmSync(stepsDir, { recursive: true })
    })
  })

  describe('discoverAsyncTasks', () => {
    it('should return empty array when directory does not exist', async () => {
      const discovery = new AutoDiscovery({
        directory: '/non/existent/path',
        pattern: /^\d+-.*\.(js|ts)$/,
        allowDuplicates: false,
      })

      const tasks = await discovery.discoverAsyncTasks()
      expect(tasks).toEqual([])
    })

    it('should discover async task files', async () => {
      const tasksDir = path.join(fixturesDir, 'async-tasks')
      fs.mkdirSync(tasksDir, { recursive: true })

      fs.writeFileSync(path.join(tasksDir, '100-task1.js'), 'module.exports = () => {}')
      fs.writeFileSync(path.join(tasksDir, '200-task2.js'), 'module.exports = () => {}')

      const discovery = new AutoDiscovery({
        directory: tasksDir,
        pattern: /^\d+-.*\.(js|ts)$/,
        allowDuplicates: false,
      })

      const tasks = await discovery.discoverAsyncTasks()
      expect(tasks.length).toBe(2)

      fs.rmSync(tasksDir, { recursive: true })
    })
  })
})
