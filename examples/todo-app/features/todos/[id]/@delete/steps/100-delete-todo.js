const db = require('#db')

module.exports = async (ctx, req, res) => {
  const deleted = db.delete(req.params.id)

  if (!deleted) {
    const error = new Error('Todo not found')
    error.statusCode = 404
    throw error
  }
}
