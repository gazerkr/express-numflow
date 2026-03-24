const path = require('path')
const { feature } = require('../../../../../../dist/cjs')

module.exports = feature({
  method: 'POST',
  path: '/validate',
  steps: path.join(__dirname, 'steps'),
})
