/**
 * Fetch user by ID
 */

import { getUserById } from '#db'

export default async (ctx, req, res) => {
  console.log(`[STEP 100] Fetching user: ${ctx.userId}`)

  const user = getUserById(ctx.userId)

  if (!user) {
    throw new Error(`User with ID ${ctx.userId} not found`)
  }

  ctx.user = user
  console.log(`[STEP 100] User found: ${user.name}`)
}
