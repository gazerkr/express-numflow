/**
 * Step 2: Create todo (ESM)
 */

import { addTodo } from '../../storage.mjs'

export default async (ctx, req, res) => {
  const todo = addTodo(ctx.todoData)
  ctx.todo = todo
}
