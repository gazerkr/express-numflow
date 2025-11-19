const { feature } = require('express-numflow')
const path = require('path')

module.exports = feature({
  method: 'POST',
  path: '/api/orders',
  steps: path.join(__dirname, 'steps'),
  asyncTasks: path.join(__dirname, 'async-tasks'),
})
