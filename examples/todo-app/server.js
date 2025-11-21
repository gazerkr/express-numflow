const express = require('express')
const path = require('path')
const { createFeatureRouter } = require('express-numflow')

async function start() {
  const app = express()

  // View engine setup
  app.set('view engine', 'ejs')
  app.set('views', path.join(__dirname, 'views'))

  // Static files
  app.use(express.static(path.join(__dirname, 'public')))

  // Middleware
  app.use(express.json())

  // Logger middleware
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`)
    next()
  })

  // Frontend route
  app.get('/', (req, res) => {
    res.render('index')
  })

  // Create Feature Router
  const featureRouter = await createFeatureRouter(
    path.join(__dirname, 'features'),
    { debug: true }
  )
  app.use(featureRouter)

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: 'Route not found',
    })
  })

  // Error handler
  app.use((err, req, res, next) => {
    console.error('Error:', err)
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error',
    })
  })

  const PORT = process.env.PORT || 3000

  app.listen(PORT, () => {
    console.log(`\nTodo App is running on http://localhost:${PORT}`)
    console.log(`\nFrontend:`)
    console.log(`  http://localhost:${PORT}`)
    console.log(`\nAPI Endpoints:`)
    console.log(`  GET    /todos          - Get all todos`)
    console.log(`  POST   /todos          - Create a new todo`)
    console.log(`  GET    /todos/:id      - Get a specific todo`)
    console.log(`  PUT    /todos/:id      - Update a todo`)
    console.log(`  DELETE /todos/:id      - Delete a todo`)
    console.log(`  PATCH  /todos/:id/complete - Mark todo as completed\n`)
  })
}

start().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
