module.exports = async (ctx, req, res) => {
  if (!req.file) {
    const err = new Error('No file uploaded')
    err.statusCode = 400
    throw err
  }
  ctx.file = {
    originalname: req.file.originalname,
    size: req.file.size,
  }
}
