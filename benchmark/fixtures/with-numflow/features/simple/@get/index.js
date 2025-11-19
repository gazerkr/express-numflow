const { feature } = require('../../../../../../dist/cjs')

module.exports = feature({
  method: 'GET',
  path: '/simple',
  steps: [
    async (ctx, req, res) => {
      res.json({ message: 'Hello, World!' })
    },
  ],
})
