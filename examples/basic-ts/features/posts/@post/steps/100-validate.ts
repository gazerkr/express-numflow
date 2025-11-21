/**
 * Validate post creation data
 *
 * POST /posts - Step 1
 *
 * Demonstrates short path: import from '@lib/validators'
 */

import { Request, Response } from 'express'
import { validatePost } from '@lib/validators'
import { CreatePostData } from '@db'

interface Context {
  postData?: CreatePostData
  validated?: boolean
}

export default async (ctx: Context, req: Request, res: Response) => {
  // Store request body in context
  ctx.postData = req.body

  // Validate
  const validation = validatePost(ctx.postData)

  if (!validation.valid) {
    // If validation fails, send error response
    // This will stop execution of subsequent steps
    return res.status(400).json({
      success: false,
      errors: validation.errors,
    })
  }

  // Validation passed, continue to next step
  ctx.validated = true
}
