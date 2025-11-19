/**
 * Step: Admin dashboard
 */
module.exports = async function dashboard(context, req, res) {
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ dashboard: 'ok' }))
}
