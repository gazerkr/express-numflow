/**
 * Validate user data
 * Throws an error that will be caught by the global error handler
 */

import { validateUserData } from '#lib/validators'
import { getUserByEmail } from '#db'

export default async (ctx, req, res) => {
  console.log('[STEP 100] Validating user data')

  ctx.userData = req.body

  // 1. Validate input format
  const validation = validateUserData(ctx.userData)

  if (!validation.valid) {
    console.log('[STEP 100] ❌ Validation failed')
    // Throw error - will be caught by global error handler
    const error = new Error('User validation failed')
    error.errors = validation.errors
    throw error
  }

  // 2. Check for duplicate email
  const existingUser = getUserByEmail(ctx.userData.email)
  if (existingUser) {
    console.log('[STEP 100] ❌ Duplicate email')
    // Throw error - will be caught by global error handler
    throw new Error(`User with email ${ctx.userData.email} already exists`)
  }

  console.log('[STEP 100] ✅ Validation passed')
}
