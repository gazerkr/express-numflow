/**
 * Step 1: Validate (ESM in .js file)
 * Works because package.json has "type": "module"
 */

export default async (ctx, req, res) => {
  const { name, price } = req.body

  if (!name) {
    res.status(400).json({ error: 'Name is required' })
    return
  }

  ctx.productData = { name, price: price || 0 }
}
