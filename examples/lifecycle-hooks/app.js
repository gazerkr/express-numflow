import express from 'express'
import { createFeatureRouter } from 'express-numflow'

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Create Feature Router with top-level await
const featureRouter = await createFeatureRouter('./features', {
  debug: true,
})

app.use(featureRouter)

// Start server
app.listen(PORT, () => {
  console.log(`\nServer running on http://localhost:${PORT}`)
  console.log('\nLifecycle Hooks Example')
  console.log('Demonstrating contextInitializer and onError\n')
  console.log('Available endpoints:')
  console.log('  POST /users          - Create user (with validation)')
  console.log('  GET  /users/:id      - Get user (with auth check)')
  console.log('  POST /posts          - Create post (with permissions)\n')
  console.log('Try:')
  console.log(`  # Valid request`)
  console.log(`  curl -X POST http://localhost:${PORT}/users \\`)
  console.log(`    -H "Content-Type: application/json" \\`)
  console.log(`    -H "Authorization: Bearer user-token" \\`)
  console.log(`    -d '{"name":"John Doe","email":"john@example.com"}'`)
  console.log(`\n  # Invalid request (missing email)`)
  console.log(`  curl -X POST http://localhost:${PORT}/users \\`)
  console.log(`    -H "Content-Type: application/json" \\`)
  console.log(`    -H "Authorization: Bearer user-token" \\`)
  console.log(`    -d '{"name":"John Doe"}'`)
})
