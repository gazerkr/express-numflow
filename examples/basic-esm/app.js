import express from 'express'
import { createFeatureRouter } from 'express-numflow'

async function bootstrap() {
  const app = express()

  // Middleware
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  // Create Feature Router from folder structure
  const featureRouter = await createFeatureRouter('./features', {
    debug: true, // Enable debug logging to see route registration
  })

  // Mount feature router
  app.use(featureRouter)

  // Error handler (optional, for uncaught errors)
  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err)
    res.status(500).json({
      success: false,
      error: err.message,
    })
  })

  // Start server
  const PORT = process.env.PORT || 3000
  app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`)
    console.log('\nAvailable endpoints:')
    console.log('  GET  /health')
    console.log('  GET  /posts')
    console.log('  POST /posts')
    console.log('  GET  /posts/:id')
    console.log('\nTry:')
    console.log(`  curl http://localhost:${PORT}/health`)
    console.log(`  curl http://localhost:${PORT}/posts`)
  })
}

bootstrap().catch(err => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
