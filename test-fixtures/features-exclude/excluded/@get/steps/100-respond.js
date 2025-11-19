/**
 * This should be excluded
 */
module.exports = async function respond(context, req, res) {
  res.statusCode = 200
  res.end('excluded')
}
