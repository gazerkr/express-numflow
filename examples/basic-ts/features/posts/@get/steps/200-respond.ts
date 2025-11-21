/**
 * Send response with posts
 *
 * GET /posts - Step 2
 */

import { Request, Response } from 'express'
import { Post } from '@db'

interface Context {
  posts: Post[]
}

export default async (ctx: Context, req: Request, res: Response) => {
  res.json({
    success: true,
    count: ctx.posts.length,
    posts: ctx.posts,
  })
}
