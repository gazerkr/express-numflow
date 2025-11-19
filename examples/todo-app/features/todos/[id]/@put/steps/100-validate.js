module.exports = async (ctx, req, res) => {
  const { title, completed } = req.body

  // At least one of title or completed must be provided
  if (title === undefined && completed === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Title is required',
    })
  }

  // Validate title if provided
  if (title !== undefined) {
    if (title.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Title is required',
      })
    }
    ctx.title = title.trim()
  }

  // Store completed if provided
  if (completed !== undefined) {
    ctx.completed = completed
  }
}
