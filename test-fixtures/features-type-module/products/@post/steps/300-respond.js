/**
 * Step 3: Send response (ESM in .js file)
 */

export default async (ctx, req, res) => {
  res.status(201).json({
    success: true,
    product: ctx.product,
    message: 'ESM in .js files works with type: module!',
  })
}
