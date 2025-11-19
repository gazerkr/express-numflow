module.exports = async (ctx, req, res) => {
  // Step 3: Transform data
  ctx.transformed = ctx.input.data.toUpperCase()
}
