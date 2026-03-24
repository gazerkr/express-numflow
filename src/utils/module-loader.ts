import { createJiti } from 'jiti'

const jiti = createJiti(process.cwd(), {
  fsCache: false,
})

/**
 * Load a user module (step, async-task, feature config, etc.)
 *
 * Supports .js, .ts, .mjs, .mts, .cjs, .cts files.
 * Handles both export default and module.exports patterns.
 *
 * Uses jiti for all file types to ensure consistent behavior
 * across CJS and ESM environments regardless of Node.js version.
 *
 * @param filePath - Absolute path to the module file
 * @returns The module's default export, or the module itself
 */
export async function loadModule(filePath: string): Promise<any> {
  const module = await jiti.import(filePath)
  return (module as any).default || module
}
