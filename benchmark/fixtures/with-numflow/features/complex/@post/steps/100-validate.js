module.exports = async (ctx, req, res) => {
  const { productId, quantity } = req.body
  if (!productId || !quantity) {
    return res.status(400).json({ error: 'ProductId and quantity are required' })
  }

  ctx.productId = productId
  ctx.quantity = quantity
}
