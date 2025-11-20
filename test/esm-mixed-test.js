/**
 * Mixed CommonJS + ESM Test
 *
 * Tests that features can mix .js (CommonJS) and .mjs (ESM) files
 */

const express = require('express')
const { createFeatureRouter } = require('../dist/cjs/index')
const path = require('path')
const http = require('http')

async function runMixedTest() {
  console.log('🧪 Testing Mixed CommonJS + ESM Support...\n')

  try {
    console.log('Test: Loading mixed features (CommonJS + ESM)...')
    const featuresDir = path.resolve(__dirname, '../test-fixtures/features-mixed')
    const router = await createFeatureRouter(featuresDir)

    const app = express()
    app.use(express.json())
    app.use(router)

    const server = app.listen(3458, async () => {
      console.log('Server started on port 3458')

      try {
        // Test POST /products with mixed steps
        console.log('\n  Testing POST /products (mixed .js and .mjs steps)...')
        const postData = await makeRequest('POST', '/products', {
          name: 'Mixed Product',
          price: 99.99,
        })

        if (postData.success && postData.product && postData.message) {
          console.log('  ✅ Mixed CommonJS + ESM works!')
          console.log('  Response:', postData)
          console.log('\n📊 Step execution order:')
          console.log('    1. 100-validate.js (CommonJS)')
          console.log('    2. 200-create.mjs (ESM)')
          console.log('    3. 300-respond.js (CommonJS)')
        } else {
          throw new Error('Mixed test failed: ' + JSON.stringify(postData))
        }

        console.log('\n✅ Mixed CommonJS + ESM test passed!')

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
      port: 3458,
      path,
      method,
      headers: { 'Content-Type': 'application/json' },
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
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

runMixedTest()
