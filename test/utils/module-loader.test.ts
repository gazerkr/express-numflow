import * as path from 'path'

describe('loadModule', () => {
  const fixture = (...segments: string[]) =>
    path.resolve(__dirname, '../../test-fixtures', ...segments)

  describe('JavaScript files', () => {
    it('should load CJS step file (module.exports)', async () => {
      const { loadModule } = await import('../../src/utils/module-loader')
      const fn = await loadModule(
        fixture('features-convention/api/products/@get/steps/100-get-products.js')
      )
      expect(typeof fn).toBe('function')
    })

    it('should load ESM step file (export default)', async () => {
      const { loadModule } = await import('../../src/utils/module-loader')
      const fn = await loadModule(
        fixture('features-esm/todos/@get/steps/100-fetch.mjs')
      )
      expect(typeof fn).toBe('function')
    })
  })

  describe('TypeScript files', () => {
    it('should load .ts step file with export default', async () => {
      const { loadModule } = await import('../../src/utils/module-loader')
      const fn = await loadModule(
        fixture('features-ts-steps/api/health/@get/steps/100-health.ts')
      )
      expect(typeof fn).toBe('function')
    })

    it('should load .ts step file that imports another .ts module', async () => {
      const { loadModule } = await import('../../src/utils/module-loader')
      const fn = await loadModule(
        fixture('features-ts-steps/api/health/@get/steps/200-respond.ts')
      )
      expect(typeof fn).toBe('function')
    })
  })

  describe('error handling', () => {
    it('should throw on non-existent file', async () => {
      const { loadModule } = await import('../../src/utils/module-loader')
      await expect(loadModule('/non/existent/file.js')).rejects.toThrow()
    })
  })
})
