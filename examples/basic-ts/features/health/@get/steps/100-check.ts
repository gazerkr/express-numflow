/**
 * Health Check Endpoint
 *
 * GET /health
 */

import { Request, Response } from 'express'

export default async (ctx: any, req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
}
