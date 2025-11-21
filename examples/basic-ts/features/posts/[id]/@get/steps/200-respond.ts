/**
 * Send response with post
 *
 * GET /posts/:id - Step 2
 */

import { Request, Response } from 'express'
import { Post } from '@db'

interface Context {
  post: Post
}

export default async (ctx: Context, req: Request, res: Response) => {
  res.json({
    success: true,
    post: ctx.post,
  })
}
