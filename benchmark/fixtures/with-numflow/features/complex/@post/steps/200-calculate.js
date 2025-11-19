module.exports = async (ctx, req, res) => {
  const price = 100
  ctx.total = price * ctx.quantity
}
