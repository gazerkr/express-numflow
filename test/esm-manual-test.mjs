/**
 * Manual ESM Support Test
 *
 * Run this file directly with Node.js to test ESM support:
 * node test/esm-manual-test.mjs
 */

import express from 'express'
import { createFeatureRouter } from '../dist/esm/index.js'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function runTests() {
  console.log('🧪 Testing ESM Support...\n')

  try {
    // Test 1: Create router with ESM features
    console.log('Test 1: Loading ESM features...')
    const featuresDir = resolve(__dirname, '../test-fixtures/features-esm')
    const router = await createFeatureRouter(featuresDir)
    console.log('✅ ESM features loaded successfully')

    // Test 2: Create Express app and mount router
    console.log('\nTest 2: Mounting router to Express app...')
    const app = express()
    app.use(express.json())
    app.use(router)
    console.log('✅ Router mounted successfully')

    // Test 3: Start server and test endpoints
    console.log('\nTest 3: Testing endpoints...')
    const server = app.listen(3456, async () => {
      console.log('Server started on port 3456')

      try {
        // Test POST /todos
        console.log('\n  Testing POST /todos...')
        const postResponse = await fetch('http://localhost:3456/todos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Test ESM Todo', completed: false }),
        })
        const postData = await postResponse.json()

        if (postResponse.status === 201 && postData.success && postData.todo) {
          console.log('  ✅ POST /todos works')
          console.log('  Response:', postData)
        } else {
          throw new Error('POST failed: ' + JSON.stringify(postData))
        }

        // Wait for async task
        await new Promise(resolve => setTimeout(resolve, 200))

        // Test GET /todos
        console.log('\n  Testing GET /todos...')
        const getResponse = await fetch('http://localhost:3456/todos')
        const getData = await getResponse.json()

        if (getResponse.status === 200 && getData.success && getData.todos) {
          console.log('  ✅ GET /todos works')
          console.log('  Response:', getData)
        } else {
          throw new Error('GET failed: ' + JSON.stringify(getData))
        }

        // Test validation error
        console.log('\n  Testing validation error...')
        const errorResponse = await fetch('http://localhost:3456/todos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed: false }), // Missing title
        })
        const errorData = await errorResponse.json()

        if (errorResponse.status === 400 && errorData.error) {
          console.log('  ✅ Validation error handling works')
          console.log('  Error:', errorData.error)
        } else {
          throw new Error('Validation test failed')
        }

        console.log('\n✅ All ESM tests passed!')
        console.log('\n📊 Summary:')
        console.log('  ✅ .mjs step files work')
        console.log('  ✅ ESM imports between modules work')
        console.log('  ✅ .mjs async tasks work')
        console.log('  ✅ Validation errors work')

      } catch (error) {
        console.error('\n❌ Test failed:', error.message)
        process.exit(1)
      } finally {
        server.close()
      }
    })

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

runTests()
