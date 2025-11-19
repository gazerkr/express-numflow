/**
 * Step: Get user by ID
 */
module.exports = async function getUser(context, req, res) {
  const userId = req.params.id

  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ userId }))
}
