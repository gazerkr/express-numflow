module.exports = async (ctx, req, res) => {
  res.statusCode = 201
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ success: true }))
}
