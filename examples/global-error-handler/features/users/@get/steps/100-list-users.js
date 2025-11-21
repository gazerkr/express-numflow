/**
 * List all users
 */

import { getAllUsers } from '#db'

export default async (ctx, req, res) => {
  console.log('[STEP 100] Fetching all users')

  const users = getAllUsers()

  console.log(`[STEP 100] Found ${users.length} users`)

  res.json({
    success: true,
    count: users.length,
    users,
  })
}
