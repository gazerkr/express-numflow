const path = require('path')
const { feature } = require('express-numflow')
const multer = require('multer')

const upload = multer({ storage: multer.memoryStorage() })

module.exports = feature({
  method: 'POST',
  path: '/api/upload',
  steps: path.join(__dirname, 'steps'),
  middlewares: [upload.single('file')],
})
