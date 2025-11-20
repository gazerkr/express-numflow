/**
 * Step 2: Send todos response (ESM)
 */

export default async (ctx, req, res) => {
  res.status(200).json({
    success: true,
    todos: ctx.todos,
    count: ctx.todos.length,
  })
}
