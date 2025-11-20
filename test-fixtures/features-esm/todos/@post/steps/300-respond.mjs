/**
 * Step 3: Send response (ESM)
 */

export default async (ctx, req, res) => {
  res.status(201).json({
    success: true,
    todo: ctx.todo,
  })
}
