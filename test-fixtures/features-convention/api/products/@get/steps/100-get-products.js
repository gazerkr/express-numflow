/**
 * Step: Get products
 */
module.exports = async function getProducts(context, req, res) {
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ products: [] }))
}
