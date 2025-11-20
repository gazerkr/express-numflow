/**
 * Step 2: Create product (ESM)
 */

const products = []
let nextId = 1

export default async (ctx, req, res) => {
  const product = {
    id: nextId++,
    ...ctx.productData,
    createdAt: new Date().toISOString(),
  }

  products.push(product)
  ctx.product = product
}
