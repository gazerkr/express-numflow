/**
 * Health Check Endpoint
 *
 * GET /health
 */

module.exports = async (ctx, req, res) => {
  res.json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
}
