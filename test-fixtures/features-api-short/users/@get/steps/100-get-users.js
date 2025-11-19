/**
 * Step: Get users
 */
module.exports = async function getUsers(context, req, res) {
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ users: [] }))
}
