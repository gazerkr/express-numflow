const db = require('#db')

module.exports = async (ctx, req, res) => {
  const todo = db.findById(req.params.id)

  if (!todo) {
    const error = new Error('Todo not found')
    error.statusCode = 404
    throw error
  }

  ctx.todo = todo
}
