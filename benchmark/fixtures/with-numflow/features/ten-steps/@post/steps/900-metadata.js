module.exports = async (ctx, req, res) => {
  // Step 9: Generate metadata
  ctx.metadata = {
    timestamp: Date.now(),
    hash: ctx.hash,
    length: ctx.transformed.length,
  }
}
