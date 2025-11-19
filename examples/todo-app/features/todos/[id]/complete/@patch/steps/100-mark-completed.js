const db = require('#db')

module.exports = async (ctx, req, res) => {
  const todo = db.markAsCompleted(req.params.id)

  if (!todo) {
    return res.status(404).json({
      success: false,
      error: 'Todo not found',
    })
  }

  ctx.todo = todo
}
