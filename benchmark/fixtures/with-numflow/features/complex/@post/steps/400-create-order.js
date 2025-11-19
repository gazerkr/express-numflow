module.exports = async (ctx, req, res) => {
  ctx.orderId = Math.floor(Math.random() * 10000)
}
