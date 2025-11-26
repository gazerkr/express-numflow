/**
 * Level 1: Response Step
 */
module.exports = async (ctx, req, res) => {
  res.status(200).json({
    success: true,
    message: 'Request processed successfully'
  })
}
