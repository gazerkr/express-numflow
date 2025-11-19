const express = require('express')
const path = require('path')
const { createFeatureRouter } = require('../../../dist/cjs')

async function start() {
  const app = express()
  app.use(express.json())

  const featureRouter = await createFeatureRouter(
    path.join(__dirname, 'features')
  )
  app.use(featureRouter)

  const PORT = process.env.PORT || 3002

  const server = app.listen(PORT, () => {
    console.log(`Numflow server running on port ${PORT}`)
  })

  // Graceful shutdown
  process.on('SIGTERM', () => {
    server.close(() => {
      console.log('Server closed')
    })
  })

  return app
}

start()

module.exports = { start }
