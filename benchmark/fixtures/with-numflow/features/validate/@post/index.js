const { feature } = require('../../../../../../dist/cjs')

module.exports = feature({
  method: 'POST',
  path: '/validate',
  steps: [
    async (ctx, req, res) => {
      const { name, email } = req.body

      if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' })
      }

      res.status(201).json({ success: true, name, email })
    },
  ],
})
