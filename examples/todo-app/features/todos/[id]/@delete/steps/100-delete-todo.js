const db = require('#db')

module.exports = async (ctx, req, res) => {
  const deleted = db.delete(req.params.id)

  if (!deleted) {
    return res.status(404).json({
      success: false,
      error: 'Todo not found',
    })
  }
}
