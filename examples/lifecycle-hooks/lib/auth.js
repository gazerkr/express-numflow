/**
 * Simple authentication utilities
 */

import { getUserByEmail } from '#db'

/**
 * Parse Authorization header and extract user
 */
export function authenticateUser(req) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header')
  }

  const token = authHeader.substring(7) // Remove 'Bearer '

  // Simple token parsing (in production, use JWT)
  // Format: "user-token" or "admin-token"
  if (token === 'user-token') {
    return { id: '2', name: 'Bob', email: 'bob@example.com', role: 'user' }
  } else if (token === 'admin-token') {
    return { id: '1', name: 'Alice', email: 'alice@example.com', role: 'admin' }
  }

  throw new Error('Invalid token')
}

/**
 * Check if user has required role
 */
export function requireRole(user, requiredRole) {
  if (requiredRole === 'admin' && user.role !== 'admin') {
    throw new Error('Admin access required')
  }
  return true
}
