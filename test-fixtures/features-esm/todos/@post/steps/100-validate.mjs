/**
 * Step 1: Validate todo data (ESM)
 */

export default async (ctx, req, res) => {
  const { title, completed } = req.body

  if (!title || typeof title !== 'string') {
    res.status(400).json({ error: 'Title is required and must be a string' })
    return
  }

  ctx.todoData = {
    title: title.trim(),
    completed: completed === true,
  }
}
