/**
 * Fetch all posts from database
 *
 * GET /posts - Step 1
 *
 * Demonstrates short path: import from '@db'
 */

import { Request, Response } from 'express'
import { getAllPosts, Post } from '@db'

interface Context {
  posts?: Post[]
}

export default async (ctx: Context, req: Request, res: Response) => {
  // Fetch all posts
  ctx.posts = getAllPosts()
}
