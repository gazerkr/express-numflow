/**
 * Step: Create order and respond immediately
 */
module.exports = async function createOrder(context, req, res) {
  context.email = req.body.email
  const orderId = Math.floor(Math.random() * 10000)

  res.statusCode = 201
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ success: true, orderId }))
}
