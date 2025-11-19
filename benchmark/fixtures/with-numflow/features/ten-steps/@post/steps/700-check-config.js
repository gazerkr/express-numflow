module.exports = async (ctx, req, res) => {
  // Step 7: Validate against config
  if (ctx.transformed.length > ctx.config.maxLength) {
    return res.status(400).json({ error: 'Data too long' })
  }
}
