/**
 * Step: Create order
 */
module.exports = async function createOrder(context, req, res) {
  res.statusCode = 201
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ success: true }))
}
