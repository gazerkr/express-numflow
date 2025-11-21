/**
 * Create user in database
 */

import { createUser } from '#db'

export default async (ctx, req, res) => {
  console.log('[STEP 200] Creating user')

  const newUser = createUser(ctx.userData)

  console.log(`[STEP 200] ✅ User created: ${newUser.id}`)

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    user: newUser,
  })
}
