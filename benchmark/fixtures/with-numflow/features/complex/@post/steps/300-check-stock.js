module.exports = async (ctx, req, res) => {
  const inStock = ctx.quantity <= 100

  if (!inStock) {
    return res.status(400).json({ error: 'Out of stock' })
  }

  ctx.inStock = true
}
