/**
 * Syntax Support Test
 *
 * Tests all supported ESM export syntax variations
 */

const express = require('express')
const { createFeatureRouter } = require('../dist/cjs/index')
const path = require('path')
const http = require('http')

async function testAllSyntax() {
  console.log('🧪 Testing All ESM Syntax Variations...\n')

  try {
    const featuresDir = path.resolve(__dirname, '../test-fixtures/features-syntax-test')
    const router = await createFeatureRouter(featuresDir)

    const app = express()
    app.use(express.json())
    app.use(router)

    const server = app.listen(3459, async () => {
      try {
        const response = await makeRequest('POST', '/test', {})

        if (response.success && response.tests) {
          console.log('✅ All syntax variations work!\n')
          console.log('Response:', JSON.stringify(response, null, 2))

          // Verify all tests executed
          const allPassed =
            response.tests.test1 === 'arrow-async' &&
            response.tests.test2 === 'arrow-sync' &&
            response.tests.test3 === 'function-async' &&
            response.tests.test4 === 'function-sync' &&
            response.tests.test5 === 'named-async'

          if (allPassed) {
            console.log('\n✅ All 5 syntax variations verified!\n')
            console.log('Supported syntaxes:')
            console.log('  ✅ export default async (ctx, req, res) => { }')
            console.log('  ✅ export default (ctx, req, res) => { }')
            console.log('  ✅ export default async function (ctx, req, res) { }')
            console.log('  ✅ export default function (ctx, req, res) { }')
            console.log('  ✅ export default async function name(ctx, req, res) { }')
          } else {
            throw new Error('Some syntax variations failed')
          }

          server.close()
          process.exit(0)
        } else {
          throw new Error('Unexpected response: ' + JSON.stringify(response))
        }
      } catch (error) {
        console.error('❌ Test failed:', error.message)
        server.close()
        process.exit(1)
      }
    })
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

function makeRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3459,
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

testAllSyntax()
