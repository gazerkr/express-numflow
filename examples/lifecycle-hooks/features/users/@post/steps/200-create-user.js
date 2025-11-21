/**
 * Create user in database
 */

import { createUser } from '#db'

export default async (ctx, req, res) => {
  console.log('[STEP 200] Creating user')

  // Create user
  ctx.newUser = createUser(ctx.userData)

  console.log(`[STEP 200] User created: ${ctx.newUser.id}`)

  // Send success response
  res.status(201).json({
    success: true,
    message: 'User created successfully',
    user: ctx.newUser,
    requestTime: ctx.requestTime,
    processingTime: new Date() - ctx.requestTime,
  })
}
