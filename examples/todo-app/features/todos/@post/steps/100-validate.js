module.exports = async (ctx, req, res) => {
  const { title } = req.body

  if (!title || title.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'Title is required',
    })
  }

  ctx.title = title.trim()
}
