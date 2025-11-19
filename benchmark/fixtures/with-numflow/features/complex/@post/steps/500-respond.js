module.exports = async (ctx, req, res) => {
  res.status(201).json({
    success: true,
    orderId: ctx.orderId,
    productId: ctx.productId,
    quantity: ctx.quantity,
    total: ctx.total,
  })
}
