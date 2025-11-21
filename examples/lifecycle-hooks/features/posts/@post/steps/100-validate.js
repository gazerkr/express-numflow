/**
 * Validate post data
 */

import { validatePostData } from '#lib/validators'

export default async (ctx, req, res) => {
  console.log('[STEP 100] Validating post data')

  const validation = validatePostData(ctx.postData)

  if (!validation.valid) {
    const error = new Error('Post validation failed')
    error.errors = validation.errors
    throw error
  }

  console.log('[STEP 100] Validation passed')
}
