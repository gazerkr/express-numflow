const express = require('express')

const app = express()
app.use(express.json())

// Scenario 1: Simple GET request
app.get('/simple', (req, res) => {
  res.json({ message: 'Hello, World!' })
})

// Scenario 2: POST request with validation
app.post('/validate', (req, res) => {
  const { name, email } = req.body

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' })
  }

  res.status(201).json({ success: true, name, email })
})

// Scenario 3: Complex logic with multiple steps
app.post('/complex', (req, res) => {
  // Step 1: Validation
  const { productId, quantity } = req.body
  if (!productId || !quantity) {
    return res.status(400).json({ error: 'ProductId and quantity are required' })
  }

  // Step 2: Business logic processing
  const price = 100
  const total = price * quantity

  // Step 3: Stock check simulation
  const inStock = quantity <= 100

  if (!inStock) {
    return res.status(400).json({ error: 'Out of stock' })
  }

  // Step 4: Order creation simulation
  const orderId = Math.floor(Math.random() * 10000)

  // Step 5: Response
  res.status(201).json({
    success: true,
    orderId,
    productId,
    quantity,
    total,
  })
})

// Scenario 4: 10-step processing
app.post('/ten-steps', (req, res) => {
  const ctx = {}

  // Step 1: Parse input
  ctx.input = req.body

  // Step 2: Validate input
  if (!ctx.input.data) {
    return res.status(400).json({ error: 'Data is required' })
  }

  // Step 3: Transform data
  ctx.transformed = ctx.input.data.toUpperCase()

  // Step 4: Calculate hash
  ctx.hash = ctx.transformed.length * 31

  // Step 5: Check permissions
  ctx.authorized = true

  // Step 6: Load configuration
  ctx.config = { maxLength: 1000 }

  // Step 7: Validate against config
  if (ctx.transformed.length > ctx.config.maxLength) {
    return res.status(400).json({ error: 'Data too long' })
  }

  // Step 8: Process business logic
  ctx.result = `Processed: ${ctx.transformed}`

  // Step 9: Generate metadata
  ctx.metadata = {
    timestamp: Date.now(),
    hash: ctx.hash,
    length: ctx.transformed.length,
  }

  // Step 10: Send response
  res.status(200).json({
    success: true,
    result: ctx.result,
    metadata: ctx.metadata,
  })
})

const PORT = process.env.PORT || 3001

const server = app.listen(PORT, () => {
  console.log(`Pure Express server running on port ${PORT}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Server closed')
  })
})

module.exports = app
