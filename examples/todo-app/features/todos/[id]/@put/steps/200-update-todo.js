const db = require('#db')

module.exports = async (ctx, req, res) => {
  const updateData = {}

  if (ctx.title !== undefined) {
    updateData.title = ctx.title
  }

  if (ctx.completed !== undefined) {
    updateData.completed = ctx.completed
  }

  const todo = db.update(req.params.id, updateData)

  if (!todo) {
    return res.status(404).json({
      success: false,
      error: 'Todo not found',
    })
  }

  ctx.todo = todo
}
