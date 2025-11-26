module.exports = async (ctx, req, res) => {
  const { title } = req.body

  if (!title || title.trim() === '') {
    const error = new Error('Title is required')
    error.statusCode = 400
    throw error
  }

  ctx.title = title.trim()
}
