const path = require('path')
const { feature } = require('../../../../../../dist/cjs')

module.exports = feature({
  method: 'GET',
  path: '/simple',
  steps: path.join(__dirname, 'steps'),
})
