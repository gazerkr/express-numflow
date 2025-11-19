module.exports = async (ctx, req, res) => {
  // Step 10: Send response
  res.status(200).json({
    success: true,
    result: ctx.result,
    metadata: ctx.metadata,
  })
}
