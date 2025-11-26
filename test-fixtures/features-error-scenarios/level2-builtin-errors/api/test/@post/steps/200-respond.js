/**
 * Level 2: Response Step
 */
module.exports = async (ctx, req, res) => {
  res.status(200).json({
    success: true,
    validated: ctx.validated
  })
}
