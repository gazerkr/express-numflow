/**
 * Step 3: Send response (CommonJS)
 */

module.exports = async (ctx, req, res) => {
  res.status(201).json({
    success: true,
    product: ctx.product,
    message: 'Mixed CommonJS and ESM works!',
  })
}
