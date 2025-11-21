/**
 * Validate user data
 */

import { validateUserData } from '#lib/validators'
import { getUserByEmail } from '#db'

export default async (ctx, req, res) => {
  console.log('[STEP 100] Validating user data')

  // Validate
  const validation = validateUserData(ctx.userData)

  if (!validation.valid) {
    // Throw error - will be caught by onError
    const error = new Error('User validation failed')
    error.errors = validation.errors
    throw error
  }

  // Check if email already exists
  const existingUser = getUserByEmail(ctx.userData.email)
  if (existingUser) {
    throw new Error(`User with email ${ctx.userData.email} already exists`)
  }

  console.log('[STEP 100] Validation passed')
}
