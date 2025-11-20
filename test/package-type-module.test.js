/**
 * Package Type Module Test
 *
 * Tests that .js files work as ESM when package.json has "type": "module"
 */

const express = require('express')
const { createFeatureRouter } = require('../dist/cjs/index')
const path = require('path')
const http = require('http')

async function testTypeModule() {
  console.log('🧪 Testing package.json "type": "module" support...\n')

  try {
    const featuresDir = path.resolve(__dirname, '../test-fixtures/features-type-module')
    console.log('Loading features from:', featuresDir)
    console.log('Expected: .js files should work as ESM\n')

    const router = await createFeatureRouter(featuresDir)

    const app = express()
    app.use(express.json())
    app.use(router)

    const server = app.listen(3460, async () => {
      try {
        console.log('Server started on port 3460\n')

        const response = await makeRequest('POST', '/products', {
          name: 'Type Module Test Product',
          price: 299.99,
        })

        console.log('Response:', JSON.stringify(response, null, 2))

        if (response.success && response.message && response.message.includes('type: module')) {
          console.log('\n✅ SUCCESS: .js files work as ESM with type: module!')
          server.close()
          process.exit(0)
        } else {
          throw new Error('Expected message not found in response')
        }
      } catch (error) {
        console.error('\n❌ FAILED:', error.message)
        console.error('\nThis means .js files are NOT recognized as ESM')
        console.error('even when package.json has "type": "module"')
        server.close()
        process.exit(1)
      }
    })
  } catch (error) {
    console.error('\n❌ ERROR:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

function makeRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3460,
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
          reject(new Error('Invalid JSON response: ' + data))
        }
      })
    })

    req.on('error', reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

testTypeModule()
