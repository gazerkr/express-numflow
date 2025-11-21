/**
 * Simple request logger
 */

export function logRequest(ctx, req) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] ${req.method} ${req.path}`)

  if (ctx.user) {
    console.log(`  User: ${ctx.user.name} (${ctx.user.role})`)
  }
}

export function logError(error, ctx, req) {
  const timestamp = new Date().toISOString()
  console.error(`[${timestamp}] ERROR ${req.method} ${req.path}`)
  console.error(`  ${error.message}`)

  if (ctx.user) {
    console.error(`  User: ${ctx.user.name} (${ctx.user.role})`)
  }
}
