module.exports = async (ctx, req, res) => {
  const { title, completed } = req.body

  // At least one of title or completed must be provided
  if (title === undefined && completed === undefined) {
    const error = new Error('Title is required')
    error.statusCode = 400
    throw error
  }

  // Validate title if provided
  if (title !== undefined) {
    if (title.trim() === '') {
      const error = new Error('Title is required')
      error.statusCode = 400
      throw error
    }
    ctx.title = title.trim()
  }

  // Store completed if provided
  if (completed !== undefined) {
    ctx.completed = completed
  }
}
