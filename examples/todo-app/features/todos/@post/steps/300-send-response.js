module.exports = async (ctx, req, res) => {
  res.status(201).json({
    success: true,
    data: ctx.todo,
  })
}
