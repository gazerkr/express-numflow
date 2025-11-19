module.exports = async (ctx, req, res) => {
  // Step 4: Calculate hash
  ctx.hash = ctx.transformed.length * 31
}
