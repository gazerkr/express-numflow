/**
 * Health Check Endpoint
 *
 * GET /health
 */

export default async (ctx, req, res) => {
  res.json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
}
