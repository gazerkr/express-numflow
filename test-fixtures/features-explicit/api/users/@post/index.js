/**
 * Test Feature: Create User
 *
 * Note: Convention doesn't work in test-fixtures, so explicit configuration is required
 */

const { feature } = require('express-numflow')
const path = require('path')

module.exports = feature({
  // Explicit configuration required in test-fixtures
  method: 'POST',
  path: '/api/users',
  steps: path.join(__dirname, 'steps'), // Use absolute path

  contextInitializer: (ctx, req, res) => {
    ctx.userData = req.body
  },

  onError: async (error, ctx, req, res) => {
    res.statusCode = 400
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({
      success: false,
      error: error.message,
    }))
  },
})
