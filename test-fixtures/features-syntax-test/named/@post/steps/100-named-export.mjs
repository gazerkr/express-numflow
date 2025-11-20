/**
 * Test: Named export (should fail)
 */

export const handler = async (ctx, req, res) => {
  ctx.test = 'named-export'
}
