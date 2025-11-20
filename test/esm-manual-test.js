/**
 * Manual ESM Support Test (using CommonJS)
 *
 * Run this file with: node test/esm-manual-test.js
 */

const express = require('express')
const { createFeatureRouter } = require('../dist/cjs/index')
const path = require('path')
const http = require('http')

async function runTests() {
  console.log('🧪 Testing ESM (.mjs) Support...\n')

  try {
    // Test 1: Create router with ESM features
    console.log('Test 1: Loading .mjs features...')
    const featuresDir = path.resolve(__dirname, '../test-fixtures/features-esm')
    const router = await createFeatureRouter(featuresDir)
    console.log('✅ .mjs features loaded successfully')

    // Test 2: Create Express app and mount router
    console.log('\nTest 2: Mounting router to Express app...')
    const app = express()
    app.use(express.json())
    app.use(router)
    console.log('✅ Router mounted successfully')

    // Test 3: Start server and test endpoints
    console.log('\nTest 3: Testing endpoints...')
    const server = app.listen(3457, async () => {
      console.log('Server started on port 3457')

      try {
        // Test POST /todos
        console.log('\n  Testing POST /todos...')
        const postData = await makeRequest('POST', '/todos', {
          title: 'Test ESM Todo',
          completed: false,
        })

        if (postData.success && postData.todo) {
          console.log('  ✅ POST /todos works')
          console.log('  Response:', postData)
        } else {
          throw new Error('POST failed: ' + JSON.stringify(postData))
        }

        // Wait for async task
        await new Promise(resolve => setTimeout(resolve, 200))

        // Test GET /todos
        console.log('\n  Testing GET /todos...')
        const getData = await makeRequest('GET', '/todos')

        if (getData.success && getData.todos) {
          console.log('  ✅ GET /todos works')
          console.log('  Response:', getData)
        } else {
          throw new Error('GET failed: ' + JSON.stringify(getData))
        }

        // Test validation error
        console.log('\n  Testing validation error...')
        const errorData = await makeRequest('POST', '/todos', { completed: false })

        if (errorData.error) {
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

        server.close()
        process.exit(0)
      } catch (error) {
        console.error('\n❌ Test failed:', error.message)
        server.close()
        process.exit(1)
      }
    })
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

function makeRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3457,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    }

    const req = http.request(options, res => {
      let data = ''
      res.on('data', chunk => (data += chunk))
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(new Error('Invalid JSON response'))
        }
      })
    })

    req.on('error', reject)

    if (body) {
      req.write(JSON.stringify(body))
    }

    req.end()
  })
}

runTests()
