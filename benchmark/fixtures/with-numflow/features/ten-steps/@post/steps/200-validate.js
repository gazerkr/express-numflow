module.exports = async (ctx, req, res) => {
  // Step 2: Validate input
  if (!ctx.input.data) {
    return res.status(400).json({ error: 'Data is required' })
  }
}
