const db = require('#db')

module.exports = async (ctx, req, res) => {
  ctx.todo = db.create({ title: ctx.title })
}
