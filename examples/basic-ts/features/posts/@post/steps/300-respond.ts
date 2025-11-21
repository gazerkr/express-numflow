/**
 * Send response with created post
 *
 * POST /posts - Step 3
 */

import { Request, Response } from 'express'
import { Post } from '@db'

interface Context {
  post: Post
}

export default async (ctx: Context, req: Request, res: Response) => {
  res.status(201).json({
    success: true,
    message: 'Post created successfully',
    post: ctx.post,
  })
}
