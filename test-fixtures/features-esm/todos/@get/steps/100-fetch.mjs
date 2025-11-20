/**
 * Step 1: Fetch todos (ESM)
 */

// Import from shared storage module
// This demonstrates ESM module imports work correctly
import { getTodos } from '../../storage.mjs'

export default async (ctx, req, res) => {
  ctx.todos = getTodos()
}
