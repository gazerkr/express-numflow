/**
 * Step: Check stock (throws error)
 */
module.exports = async function checkStock(context, req, res) {
  const productId = req.body.productId

  if (productId === 999) {
    throw new Error('Product out of stock')
  }

  context.stockAvailable = true
}
