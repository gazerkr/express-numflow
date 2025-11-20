/**
 * Syntax Test 5: Named function + async
 */

export default async function handleRequest(ctx, req, res) {
  ctx.test5 = 'named-async'
}
