const { feature } = require('express-numflow')
const path = require('path')

module.exports = feature({
  method: 'POST',
  path: '/api/orders',
  steps: path.join(__dirname, 'steps'),
  onError: async (error, context, req, res) => {
    res.statusCode = 400
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({
      success: false,
      error: error.message,
    }))
  },
})
