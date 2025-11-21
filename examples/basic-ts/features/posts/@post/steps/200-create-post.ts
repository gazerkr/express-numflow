/**
 * Create new post in database
 *
 * POST /posts - Step 2
 */

import { Request, Response } from 'express'
import { createPost, CreatePostData, Post } from '@db'

interface Context {
  postData: CreatePostData
  post?: Post
}

export default async (ctx: Context, req: Request, res: Response) => {
  // Create post
  ctx.post = createPost(ctx.postData)

  console.log('Created new post:', ctx.post.id)
}
