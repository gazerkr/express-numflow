module.exports = async (ctx, req, res) => {
  res.json({
    success: true,
    data: ctx.todos,
    count: ctx.todos.length,
  })
}
