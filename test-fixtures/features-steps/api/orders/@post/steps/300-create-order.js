/**
 * Step 3: Create order and send response
 */
module.exports = async function createOrder(context, req, res) {
  context.orderCreated = true

  const orderId = Math.floor(Math.random() * 10000)

  res.statusCode = 201
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({
    success: true,
    orderId,
    validated: context.validated,
    stockChecked: context.stockChecked,
    orderCreated: context.orderCreated,
  }))
}
